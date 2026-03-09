/**
 * useRegenerate — Hook for regenerating AI responses
 *
 * Sends a 'regenerate' event via WebSocket so the response
 * streams in real-time through the existing chat streaming pipeline.
 */

import { useCallback } from 'react';
import { getWebSocketManager } from '@/api/websocket/manager';
import { useChatStore } from '../state/chatStore';
import { toast } from 'sonner';

interface UseRegenerateOptions {
    /** Session ID for channel routing and cache invalidation */
    sessionId: number;
}

export function useRegenerate({ sessionId }: UseRegenerateOptions) {

    const regenerate = useCallback(
        (messageId: number) => {
            const manager = getWebSocketManager();
            if (!manager.isConnected()) {
                toast.error('WebSocket not connected');
                return;
            }

            const channel = `chat:${sessionId}`;

            // Clear previous streaming state and start fresh
            const state = useChatStore.getState();
            state.clearStreaming();
            state.setIsStreaming(true);

            // Send regenerate event via WS
            manager.send({
                type: 'regenerate',
                channel,
                messageId,
            });

            toast.info('Regenerating response...');
        },
        [sessionId]
    );

    return { regenerate };
}
