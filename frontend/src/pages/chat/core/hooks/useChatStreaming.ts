/**
 * useChatStreaming - Thin Adapter Hook for WebSocket Streaming
 *
 * INVARIANT:
 * This hook DOES NOT own state. It wires:
 * - WebSocket manager (side effects)
 * - Chat store (authority)
 * - React Query (message persistence)
 *
 * Key responsibilities:
 * - Connect/subscribe to WebSocket channels
 * - Route WebSocket events to store actions
 * - Manage optimistic updates for user messages
 *
 * Based on production patterns from TanStack Query + WebSocket integration.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getWebSocketManager } from '@/api/websocket/manager';
import type { ChatMessageResponse } from '@/api/generated';
import { useChatStore } from '../state/chatStore';
import {
    useConnectionState,
    useIsStreaming,
    useStreamingContent,
    useStreamingThinking,
    useStreamingSources,
} from '../state/chatSelectors';

// ==================== TYPES ====================

interface ChatWSMessage {
    type:
    | 'subscribed'
    | 'thinking'
    | 'token'
    | 'sources'
    | 'complete'
    | 'error'
    | 'tool_call'
    | 'tool_result';
    channel?: string;
    data?: any;
    event?: string;
}

interface UseChatStreamingOptions {
    sessionId?: number;
    onMessage?: (message: ChatWSMessage) => void;
    autoConnect?: boolean;
}

// ==================== HOOK ====================

export function useChatStreaming({
    sessionId,
    onMessage,
    autoConnect = true,
}: UseChatStreamingOptions) {
    const queryClient = useQueryClient();
    const manager = getWebSocketManager();
    const store = useChatStore();

    // ==================== SUBSCRIPTIONS (fine-grained) ====================
    const connectionState = useConnectionState();
    const isStreaming = useIsStreaming();
    const streamingContent = useStreamingContent();
    const streamingThinking = useStreamingThinking();
    const streamingSources = useStreamingSources();

    // ==================== REFS ====================
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const subscribedChannelRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);

    // ==================== HELPERS ====================

    const getChannel = useCallback((sid: number): string => `chat:${sid}`, []);

    // ==================== MESSAGE HANDLERS ====================

    const handleMessage = useCallback(
        (message: ChatWSMessage) => {
            const eventType = message.type || message.event;
            const eventData = message.data || message;

            console.log('[Chat] Received:', eventType, message);
            onMessage?.(message);

            switch (eventType) {
                case 'subscribed':
                    console.log('[Chat] Subscribed to channel:', message.channel);
                    break;

                case 'thinking':
                    store.appendThinking(eventData.text || '');
                    store.setModel(eventData.model || '');
                    store.setIsStreaming(true);
                    break;

                case 'token':
                    store.appendContent(eventData.text || '');
                    store.setModel(eventData.model || '');
                    store.setIsStreaming(true);
                    break;

                case 'sources':
                    store.setSources(eventData.sources || []);
                    break;

                case 'complete':
                    console.log('[Chat] Stream complete:', {
                        total_tokens: eventData.total_tokens,
                        model: eventData.model_used,
                    });

                    if (sessionId) {
                        // Invalidate queries then clear streaming state
                        setTimeout(async () => {
                            await queryClient.invalidateQueries({
                                queryKey: ['chat-messages', sessionId],
                            });
                            store.clearStreaming();
                        }, 100);
                    } else {
                        store.clearStreaming();
                    }
                    break;

                case 'error':
                    console.error('[Chat] Server error:', eventData.message);
                    store.clearStreaming();
                    break;

                case 'tool_call':
                    console.log('[Chat] Tool call:', eventData.name, eventData.args);
                    store.addToolCall({
                        name: eventData.name,
                        args: eventData.args,
                        status: 'executing',
                    });
                    break;

                case 'tool_result':
                    console.log('[Chat] Tool result:', eventData.name, eventData.result);
                    store.updateToolCall(eventData.name, {
                        result: eventData.result,
                        status: 'complete',
                    });
                    break;

                default:
                    console.warn('[Chat] Unknown message type:', eventType);
            }
        },
        [onMessage, sessionId, queryClient, store]
    );

    // ==================== CONNECTION & SUBSCRIPTION ====================

    const subscribeToChannel = useCallback(
        (channel: string): void => {
            if (subscribedChannelRef.current === channel) {
                console.log('[Chat] Already subscribed to:', channel);
                return;
            }

            // Unsubscribe from previous channel
            if (unsubscribeRef.current) {
                console.log('[Chat] Unsubscribing from old channel:', subscribedChannelRef.current);
                unsubscribeRef.current();
                unsubscribeRef.current = null;
                subscribedChannelRef.current = null;
            }

            console.log('[Chat] Subscribing to channel:', channel);

            // Frontend-side subscription
            const unsub = manager.subscribe(channel, handleMessage);
            unsubscribeRef.current = unsub;
            subscribedChannelRef.current = channel;

            // Send subscription to backend
            const sendSubscribe = () => {
                if (manager.isConnected() && manager.getConnectionState() === 'connected') {
                    console.log('[Chat] Sending subscribe to backend:', channel);
                    manager.send({ type: 'subscribe', channel });
                    return true;
                }
                return false;
            };

            if (!sendSubscribe()) {
                console.log('[Chat] Connection not ready, will retry...');
                setTimeout(() => {
                    if (subscribedChannelRef.current === channel) {
                        sendSubscribe();
                    }
                }, 100);
            }
        },
        [manager, handleMessage]
    );

    const unsubscribeFromChannel = useCallback(() => {
        if (unsubscribeRef.current) {
            console.log('[Chat] Unsubscribing from:', subscribedChannelRef.current);

            if (subscribedChannelRef.current && manager.isConnected()) {
                manager.send({ type: 'unsubscribe', channel: subscribedChannelRef.current });
            }

            unsubscribeRef.current();
            unsubscribeRef.current = null;
            subscribedChannelRef.current = null;
        }
    }, [manager]);

    // ==================== SEND MESSAGE ====================

    const sendMessage = useCallback(
        (content: string) => {
            console.log('[Chat] sendMessage:', {
                contentLength: content.length,
                isConnected: manager.isConnected(),
                sessionId,
                subscribedTo: subscribedChannelRef.current,
            });

            if (!manager.isConnected()) {
                throw new Error('WebSocket not connected');
            }

            if (!sessionId) {
                throw new Error('No session ID');
            }

            if (!subscribedChannelRef.current) {
                throw new Error('Not subscribed to channel');
            }

            try {
                const channel = getChannel(sessionId);

                // Optimistic update: add user message to cache
                const optimisticMessage: ChatMessageResponse = {
                    id: -Date.now(),
                    session_id: sessionId,
                    role: "user" as const,
                    content,
                    tokens: Math.ceil(content.length / 4),
                    model_used: null,
                    function_calls: null,
                    grounding_sources: null,
                    created_at: new Date().toISOString(),
                };

                console.log('[Chat] Adding optimistic user message');
                queryClient.setQueryData<ChatMessageResponse[]>(
                    ['chat-messages', sessionId],
                    (old = []) => [...old, optimisticMessage]
                );

                // Send via WebSocket
                manager.send({ type: 'message', channel, content });
                console.log('[Chat] Message sent');

                // Clear any previous streaming state
                store.clearStreaming();

                return true;
            } catch (error) {
                console.error('[Chat] Failed to send:', error);
                throw error;
            }
        },
        [manager, sessionId, queryClient, store, getChannel]
    );

    // ==================== LIFECYCLE ====================

    // Monitor WebSocketManager connection state
    // NOTE: store.setConnectionState is a stable function, so we can reference it directly
    // to avoid creating new subscriptions on every render
    useEffect(() => {
        const setConnectionState = useChatStore.getState().setConnectionState;
        const unsub = manager.onStateChange((state) => {
            setConnectionState(state);
        });
        return unsub;
    }, [manager]);

    // Auto-connect if needed
    useEffect(() => {
        if (autoConnect && !manager.isConnected()) {
            console.log('[Chat] Auto-connecting WebSocketManager');
            manager.connect();
        }
    }, [manager, autoConnect]);

    // Subscribe/unsubscribe based on sessionId
    const subscribeRef = useRef(subscribeToChannel);
    const unsubscribeRef2 = useRef(unsubscribeFromChannel);

    useEffect(() => {
        subscribeRef.current = subscribeToChannel;
        unsubscribeRef2.current = unsubscribeFromChannel;
    });

    useEffect(() => {
        console.log('[Chat] Effect triggered:', {
            sessionId,
            autoConnect,
            isConnected: manager.isConnected(),
            currentChannel: subscribedChannelRef.current,
        });

        isMountedRef.current = true;

        if (!sessionId || !autoConnect) {
            unsubscribeRef2.current();
            return;
        }

        const channel = `chat:${sessionId}`;

        if (manager.isConnected()) {
            subscribeRef.current(channel);
        } else {
            console.log('[Chat] Waiting for WebSocket connection...');
            const unsub = manager.onStateChange((state) => {
                if (state === 'connected' && isMountedRef.current) {
                    subscribeRef.current(channel);
                    unsub();
                }
            });
            return () => {
                unsub();
                unsubscribeRef2.current();
            };
        }

        return () => {
            unsubscribeRef2.current();
        };
    }, [sessionId, autoConnect, manager]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('[Chat] Component unmounting');
            isMountedRef.current = false;
        };
    }, []);

    // ==================== RETURN ====================

    return {
        // Connection state (from store)
        connectionState,
        isConnected: connectionState === 'connected' && manager.isConnected(),

        // Streaming state (from store)
        isStreaming,
        streamingContent,
        streamingThinking,
        streamingSources,

        // Methods
        sendMessage,
        subscribeToChannel: (sid: number) => subscribeToChannel(getChannel(sid)),
        unsubscribeFromChannel,

        // Legacy compatibility
        isConnectionConfirmed: connectionState === 'connected' && manager.isConnected(),
        webSocketReadyState: manager.isConnected() ? 1 : 0,
    };
}

export default useChatStreaming;
