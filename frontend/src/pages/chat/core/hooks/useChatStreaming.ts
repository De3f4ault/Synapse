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
    | 'cancelled'
    | 'stopped'
    | 'error'
    | 'tool_call'
    | 'tool_result'
    | 'model_upgraded'
    | 'warning';
    channel?: string;
    data?: any;
    event?: string;
    model_slot?: 'A' | 'B';  // For comparison mode
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
    // NOTE: We use useChatStore.getState() inside callbacks for stable references
    // instead of storing it in a variable that would cause callback recreation

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

            // ── THREAD ISOLATION ──
            // Thread events carry thread_id. Skip them here — the ThreadConversation
            // component handles its own streaming via a separate subscription.
            if (eventData.thread_id) {
                return;
            }

            // Get store actions via getState() for stable reference
            const actions = useChatStore.getState();

            // Only log non-token events to reduce console noise
            if (eventType !== 'token') {
                console.log('[Chat] Received:', eventType, message);
            }
            onMessage?.(message);

            switch (eventType) {
                case 'subscribed':
                    console.log('[Chat] Subscribed to channel:', message.channel);
                    break;

                case 'thinking':
                    // Check if this is a comparison mode chunk
                    if (eventData.model_slot && actions.isComparisonMode) {
                        actions.appendToSlot(eventData.model_slot, eventData.text || '', 'thinking');
                    } else {
                        actions.appendThinking(eventData.text || '');
                    }
                    actions.setModel(eventData.model || '');
                    actions.setIsStreaming(true);
                    break;

                case 'token':
                    // Check if this is a comparison mode chunk
                    if (eventData.model_slot && actions.isComparisonMode) {
                        actions.appendToSlot(eventData.model_slot, eventData.text || '', 'content');
                    } else {
                        actions.appendContent(eventData.text || '');
                    }
                    actions.setModel(eventData.model || '');
                    actions.setIsStreaming(true);
                    break;

                case 'sources':
                    actions.setSources(eventData.sources || []);
                    break;

                case 'complete':
                    console.log('[Chat] Stream complete:', {
                        total_tokens: eventData.total_tokens,
                        model: eventData.model_used,
                        grounding_sources: eventData.grounding_sources?.length ?? 0,
                    });
                    // Capture grounding sources from complete event
                    if (eventData.grounding_sources && eventData.grounding_sources.length > 0) {
                        actions.setSources(eventData.grounding_sources);
                    }
                    // Handle comparison mode: mark individual slot complete
                    if (eventData.model_slot && actions.isComparisonMode) {
                        actions.markSlotComplete(eventData.model_slot);
                        // Only clear streaming when BOTH slots are complete
                        const state = useChatStore.getState();
                        const otherSlot = eventData.model_slot === 'A' ? 'B' : 'A';
                        if (state.comparisonStreaming[otherSlot].isComplete) {
                            // Both done — invalidate, then clear streaming + comparison
                            // The saved message now has comparison metadata in function_calls,
                            // so ChatMessage will render it as a ComparisonPanel
                            if (sessionId) {
                                setTimeout(async () => {
                                    await queryClient.invalidateQueries({
                                        queryKey: ['chat-messages', sessionId],
                                    });
                                    const s = useChatStore.getState();
                                    s.clearStreaming();
                                    s.clearComparison();
                                }, 100);
                            } else {
                                actions.clearStreaming();
                                actions.clearComparison();
                            }
                        }
                    } else {
                        // Normal mode: clear immediately
                        if (sessionId) {
                            setTimeout(async () => {
                                await queryClient.invalidateQueries({
                                    queryKey: ['chat-messages', sessionId],
                                });
                                useChatStore.getState().clearStreaming();
                            }, 100);
                        } else {
                            actions.clearStreaming();
                        }
                    }
                    break;

                case 'cancelled':
                    console.log('[Chat] Generation cancelled:', eventData);
                    actions.setIsStreaming(false);
                    if (sessionId) {
                        setTimeout(async () => {
                            await queryClient.invalidateQueries({
                                queryKey: ['chat-messages', sessionId],
                            });
                            useChatStore.getState().clearStreaming();
                        }, 100);
                    } else {
                        actions.clearStreaming();
                    }
                    break;

                case 'stopped':
                    console.log('[Chat] Generation stopped:', eventData);
                    actions.setIsStreaming(false);
                    if (sessionId) {
                        setTimeout(async () => {
                            await queryClient.invalidateQueries({
                                queryKey: ['chat-messages', sessionId],
                            });
                            useChatStore.getState().clearStreaming();
                        }, 100);
                    } else {
                        actions.clearStreaming();
                    }
                    break;

                case 'error':
                    console.error('[Chat] Server error:', eventData.message);
                    actions.clearStreaming();
                    break;

                case 'tool_call':
                    console.log('[Chat] Tool call:', eventData.name, eventData.args);
                    actions.addToolCall({
                        name: eventData.name,
                        args: eventData.args,
                        status: 'executing',
                    });
                    break;

                case 'tool_result':
                    console.log('[Chat] Tool result:', eventData.name, eventData.result);
                    actions.updateToolCall(eventData.name, {
                        result: eventData.result,
                        status: 'complete',
                    });
                    break;

                case 'model_upgraded':
                    console.log('[Chat] Model upgraded for vision:', eventData.original_model, '→', eventData.upgraded_to);
                    // Toast-style: log prominently, clear after streaming completes
                    actions.setModel(eventData.upgraded_to || '');
                    break;

                case 'warning':
                    console.warn('[Chat] Warning:', eventData.message);
                    break;

                default:
                    console.warn('[Chat] Unknown message type:', eventType);
            }
        },
        [onMessage, sessionId, queryClient]  // Removed 'store' - now stable!
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
        (content: string, options?: { attachmentIds?: number[] }) => {
            const state = useChatStore.getState();
            const chatMode = state.chatMode;
            const isComparisonMode = state.isComparisonMode;
            const selectedModels = state.selectedModels;
            const selectedModel = state.selectedModel;
            const attachmentIds = options?.attachmentIds;
            
            console.log('[Chat] sendMessage:', {
                contentLength: content.length,
                isConnected: manager.isConnected(),
                sessionId,
                subscribedTo: subscribedChannelRef.current,
                mode: chatMode,
                model: selectedModel,
                compare: isComparisonMode,
                models: isComparisonMode ? selectedModels : undefined,
                attachments: attachmentIds?.length ?? 0,
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

            // Clear previous comparison streaming state if in comparison mode
            if (isComparisonMode) {
                state.clearComparison();
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
                    attachments: attachmentIds ? attachmentIds.map(id => ({
                        document_id: id,
                        filename: 'uploading...',
                        content_type: 'image/*',
                    })) : null,
                    created_at: new Date().toISOString(),
                };

                console.log('[Chat] Adding optimistic user message');
                queryClient.setQueryData<ChatMessageResponse[]>(
                    ['chat-messages', sessionId],
                    (old = []) => [...old, optimisticMessage]
                );

                // Send via WebSocket with mode and optional comparison/model flags
                const message: Record<string, unknown> = { 
                    type: 'message', 
                    channel, 
                    content, 
                    mode: chatMode 
                };
                
                // Add model override if a specific model is selected
                if (selectedModel) {
                    message.model = selectedModel;
                }
                
                // Add comparison mode flags
                if (isComparisonMode) {
                    message.compare = true;
                    message.models = selectedModels;
                }

                // Add attachment IDs for multimodal messages
                if (attachmentIds && attachmentIds.length > 0) {
                    message.attachment_ids = attachmentIds;
                }
                
                manager.send(message);
                console.log('[Chat] Message sent with mode:', chatMode, selectedModel ? `(model: ${selectedModel})` : '', isComparisonMode ? `(comparing: ${selectedModels.join(' vs ')})` : '', attachmentIds?.length ? `(attachments: ${attachmentIds.length})` : '');


                // Clear any previous streaming state
                useChatStore.getState().clearStreaming();
                useChatStore.getState().setIsStreaming(true);

                return true;
            } catch (error) {
                console.error('[Chat] Failed to send:', error);
                useChatStore.getState().setIsStreaming(false);
                throw error;
            }
        },
        [manager, sessionId, queryClient, getChannel]  // Removed 'store'
    );

    // Stop current generation
    const stopGeneration = useCallback(() => {
        console.log('[Chat] stopGeneration called');

        if (!manager.isConnected()) {
            console.warn('[Chat] Cannot stop - WebSocket not connected');
            return;
        }

        if (!sessionId) {
            console.warn('[Chat] Cannot stop - No session ID');
            return;
        }

        try {
            const channel = getChannel(sessionId);
            manager.send({ type: 'stop', channel });
            console.log('[Chat] Stop signal sent');

            // Immediately update local state
            useChatStore.getState().setIsStreaming(false);
        } catch (error) {
            console.error('[Chat] Failed to send stop:', error);
        }
    }, [manager, sessionId, getChannel]);

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
        stopGeneration,
        subscribeToChannel: (sid: number) => subscribeToChannel(getChannel(sid)),
        unsubscribeFromChannel,

        // Legacy compatibility
        isConnectionConfirmed: connectionState === 'connected' && manager.isConnected(),
        webSocketReadyState: manager.isConnected() ? 1 : 0,
    };
}

export default useChatStreaming;
