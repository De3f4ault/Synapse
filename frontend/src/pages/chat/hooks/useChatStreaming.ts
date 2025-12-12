/**
 * useChatStreaming - Production-Grade Streaming Chat Hook
 *
 * Industry-standard pattern for WebSocket streaming with React Query:
 * - Optimistic user message updates
 * - Streaming assistant responses accumulated in memory
 * - Query invalidation for final persistence
 * - No temporary IDs or race conditions
 *
 * Based on:
 * - TanStack Query WebSocket patterns (tkdodo.eu/blog/using-web-sockets-with-react-query)
 * - React Query optimistic updates (tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
 * - Production chat implementations (LibreChat, Stream Chat)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getWebSocketManager } from '@/api/websocket/manager';
import type { ChatMessageResponse } from '@/api/generated';

// ==================== TYPES ====================

export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ChatWSMessage {
    type: 'subscribed' | 'thinking' | 'token' | 'sources' | 'complete' | 'error';
    channel?: string;
    data?: any;
    event?: string;
}

interface UseChatStreamingOptions {
    sessionId?: number;
    onMessage?: (message: ChatWSMessage) => void;
    onStateChange?: (state: WebSocketState) => void;
    autoConnect?: boolean;
}

// ==================== HOOK ====================

export const useChatStreaming = ({
    sessionId,
    onMessage,
    onStateChange,
    autoConnect = true,
}: UseChatStreamingOptions) => {
    const queryClient = useQueryClient();
    const manager = getWebSocketManager();

    // ==================== STATE ====================

    const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');
    const [isStreaming, setIsStreaming] = useState(false);

    // Streaming accumulation state (in-memory only, not persisted)
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingThinking, setStreamingThinking] = useState('');
    const [streamingSources, setStreamingSources] = useState<any[]>([]);
    const [streamingModel, setStreamingModel] = useState('');

    // Track current subscription
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const subscribedChannelRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);

    // ==================== HELPERS ====================

    const getChannel = useCallback((sid: number): string => {
        return `chat:${sid}`;
    }, []);

    /**
     * Clear all streaming state
     */
    const clearStreamingState = useCallback(() => {
        console.log('[Chat] 🧹 Clearing streaming state');
        setIsStreaming(false);
        setStreamingContent('');
        setStreamingThinking('');
        setStreamingSources([]);
        setStreamingModel('');
    }, []);

    // ==================== MESSAGE HANDLERS ====================

    const handleMessage = useCallback((message: ChatWSMessage) => {
        const eventType = message.type || message.event;
        const eventData = message.data || message;

        console.log('[Chat] 📨 Received:', eventType, message);

        // Call external handler if provided
        onMessage?.(message);

        switch (eventType) {
            case 'subscribed':
                console.log('[Chat] ✅ Subscribed to channel:', message.channel);
                break;

            case 'thinking':
                const thinkingText = eventData.text || '';
                setStreamingThinking((prev) => prev + thinkingText);
                setStreamingModel(eventData.model || streamingModel);
                setIsStreaming(true);
                break;

            case 'token':
                const tokenText = eventData.text || '';
                setStreamingContent((prev) => prev + tokenText);
                setStreamingModel(eventData.model || streamingModel);
                setIsStreaming(true);
                break;

            case 'sources':
                setStreamingSources(eventData.sources || []);
                break;

            case 'complete':
                console.log('[Chat] ✅ Stream complete:', {
                    total_tokens: eventData.total_tokens,
                    model: eventData.model_used,
                });

                /**
                 * PRODUCTION PATTERN:
                 * Invalidate queries to fetch the final, persisted message from backend.
                 * This ensures we always display the authoritative server state.
                 *
                 * Why invalidate instead of setQueryData?
                 * - Backend has the true message ID
                 * - Backend has accurate token counts
                 * - Backend has metadata (grounding sources, function calls)
                 * - Avoids stale data and race conditions
                 */
                if (sessionId) {
                    console.log('[Chat] 🔄 Invalidating queries to fetch final message');
                    queryClient.invalidateQueries({
                        queryKey: ['chat-messages', sessionId],
                        exact: true,
                    });
                }

                // Clear streaming state after invalidation
                clearStreamingState();
                break;

            case 'error':
                console.error('[Chat] ❌ Server error:', eventData.message);
                clearStreamingState();
                break;

            default:
                console.warn('[Chat] ⚠️ Unknown message type:', eventType);
        }
    }, [onMessage, sessionId, queryClient, clearStreamingState, streamingModel]);

    // ==================== CONNECTION & SUBSCRIPTION ====================

    const subscribeToChannel = useCallback((channel: string) => {
        if (subscribedChannelRef.current === channel) {
            console.log('[Chat] ℹ️ Already subscribed to:', channel);
            return;
        }

        // Unsubscribe from previous channel
        if (unsubscribeRef.current) {
            console.log('[Chat] 🔌 Unsubscribing from old channel:', subscribedChannelRef.current);
            unsubscribeRef.current();
            unsubscribeRef.current = null;
            subscribedChannelRef.current = null;
        }

        console.log('[Chat] 🔌 Subscribing to channel:', channel);

        // Frontend-side subscription
        const unsub = manager.subscribe(channel, handleMessage);
        unsubscribeRef.current = unsub;
        subscribedChannelRef.current = channel;

        // Send subscription to backend
        const sendSubscribe = () => {
            if (manager.isConnected() && manager.getConnectionState() === 'connected') {
                console.log('[Chat] 📡 Sending subscribe to backend:', channel);
                manager.send({
                    type: 'subscribe',
                    channel,
                });
                return true;
            }
            return false;
        };

        // Try immediately, retry if needed
        if (!sendSubscribe()) {
            console.log('[Chat] ⏳ Connection not ready, will retry...');
            const retryTimer = setTimeout(() => {
                if (subscribedChannelRef.current === channel) {
                    if (sendSubscribe()) {
                        console.log('[Chat] ✅ Subscribe sent after retry');
                    } else {
                        console.error('[Chat] ❌ Failed to send subscribe');
                    }
                }
            }, 100);
            return () => clearTimeout(retryTimer);
        }
    }, [manager, handleMessage]);

    const unsubscribeFromChannel = useCallback(() => {
        if (unsubscribeRef.current) {
            console.log('[Chat] 🔌 Unsubscribing from:', subscribedChannelRef.current);

            // Send unsubscribe to server
            if (subscribedChannelRef.current && manager.isConnected()) {
                console.log('[Chat] 📡 Sending unsubscribe to backend');
                manager.send({
                    type: 'unsubscribe',
                    channel: subscribedChannelRef.current,
                });
            }

            unsubscribeRef.current();
            unsubscribeRef.current = null;
            subscribedChannelRef.current = null;
        }
    }, [manager]);

    // ==================== SEND MESSAGE ====================

    const sendMessage = useCallback((content: string) => {
        console.log('[Chat] 📤 sendMessage:', {
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

            /**
             * PRODUCTION PATTERN - OPTIMISTIC UPDATE:
             * Add user message to cache immediately for instant feedback.
             *
             * Important:
             * - Use optimistic ID (negative timestamp) to avoid collision
             * - Backend will save real message with real ID
             * - Query invalidation after backend saves will replace optimistic message
             */
            const optimisticUserMessage: ChatMessageResponse = {
                id: -Date.now(), // Negative ID indicates optimistic
                                    session_id: sessionId,
                                    role: 'user',
                                    content,
                                    tokens: Math.ceil(content.length / 4),
                                    model_used: null,
                                    function_calls: null,
                                    grounding_sources: null,
                                    created_at: new Date().toISOString(),
            };

            console.log('[Chat] 🔮 Adding optimistic user message');
            queryClient.setQueryData<ChatMessageResponse[]>(
                ['chat-messages', sessionId],
                (old = []) => [...old, optimisticUserMessage]
            );

            // Send message via WebSocket
            manager.send({
                type: 'message',
                channel,
                content,
            });

            console.log('[Chat] ✅ Message sent');

            // Clear any previous streaming state
            clearStreamingState();

            return true;
        } catch (error) {
            console.error('[Chat] ❌ Failed to send:', error);
            throw error;
        }
    }, [manager, sessionId, queryClient, clearStreamingState, getChannel]);

    // ==================== LIFECYCLE ====================

    // Monitor WebSocketManager connection state
    useEffect(() => {
        const unsub = manager.onStateChange((state) => {
            setConnectionState(state);
            onStateChange?.(state);
        });

        return unsub;
    }, [manager, onStateChange]);

    // Auto-connect manager if not connected
    useEffect(() => {
        if (autoConnect && !manager.isConnected()) {
            console.log('[Chat] 🔌 Auto-connecting WebSocketManager');
            manager.connect();
        }
    }, [manager, autoConnect]);

    // Subscribe/unsubscribe based on sessionId
    useEffect(() => {
        console.log('[Chat] 🔄 Effect triggered:', {
            sessionId,
            autoConnect,
            isConnected: manager.isConnected(),
                    currentChannel: subscribedChannelRef.current,
        });

        isMountedRef.current = true;

        if (!sessionId || !autoConnect) {
            unsubscribeFromChannel();
            return;
        }

        const channel = getChannel(sessionId);

        // Only subscribe if connected
        if (manager.isConnected()) {
            subscribeToChannel(channel);
        } else {
            // Wait for connection
            console.log('[Chat] ⏳ Waiting for WebSocket connection...');
            const unsub = manager.onStateChange((state) => {
                if (state === 'connected' && isMountedRef.current) {
                    subscribeToChannel(channel);
                    unsub();
                }
            });
            return () => {
                unsub();
                unsubscribeFromChannel();
            };
        }

        return () => {
            unsubscribeFromChannel();
        };
    }, [sessionId, autoConnect, manager, getChannel, subscribeToChannel, unsubscribeFromChannel]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('[Chat] 🧹 Component unmounting');
            isMountedRef.current = false;
        };
    }, []);

    // ==================== RETURN ====================

    return {
        // Connection state
        connectionState,
        isConnected: connectionState === 'connected' && manager.isConnected(),

        // Streaming state (in-memory accumulation)
        isStreaming,
        streamingContent,
        streamingThinking,
        streamingSources,
        currentModel: streamingModel,

        // Methods
        sendMessage,
        subscribeToChannel: (sid: number) => subscribeToChannel(getChannel(sid)),
        unsubscribeFromChannel,

        // Legacy compatibility
        isConnectionConfirmed: connectionState === 'connected' && manager.isConnected(),
        webSocketReadyState: manager.isConnected() ? 1 : 0,
    };
};

export default useChatStreaming;
