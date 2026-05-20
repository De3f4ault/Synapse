/**
 * useRegenerate — Hook for regenerating AI responses
 *
 * TRANSPORT: REST (delete + re-stream via SSE)
 *
 * Strategy:
 *   1. Delete the target assistant message via REST API
 *   2. Invalidate React Query cache so it disappears from the UI
 *   3. Send a new stream request via SSE using the preceding user message
 *
 * This replaces the old WebSocket-based regenerate dispatch.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '../state/chatStore';
import { toast } from 'sonner';
import type { ChatMessageResponse } from '@/api/generated';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface UseRegenerateOptions {
    /** Session ID for cache invalidation */
    sessionId: number;
}

export function useRegenerate({ sessionId }: UseRegenerateOptions) {
    const queryClient = useQueryClient();

    const regenerate = useCallback(
        async (messageId: number) => {
            const token = useAuthStore.getState().token;
            const store = useChatStore.getState();

            try {
                // 1. Delete the assistant message via existing REST endpoint
                const deleteRes = await fetch(
                    `${API_BASE}/api/v1/chat/messages/${messageId}`,
                    {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (!deleteRes.ok && deleteRes.status !== 404) {
                    throw new Error(`Delete failed: ${deleteRes.status}`);
                }

                // 2. Remove from React Query cache immediately
                queryClient.setQueryData<ChatMessageResponse[]>(
                    ['chat-messages', sessionId],
                    (old = []) => old.filter(m => m.id !== messageId)
                );

                // 3. Find the user message that preceded the deleted assistant message
                const messages = queryClient.getQueryData<ChatMessageResponse[]>(
                    ['chat-messages', sessionId]
                ) || [];

                const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                if (!lastUserMsg) {
                    toast.error('No user message to regenerate from');
                    return;
                }

                // 4. Re-stream via the SSE endpoint
                store.clearStreaming();
                store.setIsStreaming(true);

                const streamRes = await fetch(
                    `${API_BASE}/api/v1/chat/sessions/${sessionId}/stream`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages: [{
                                role: 'user',
                                parts: [{ type: 'text', text: lastUserMsg.content }],
                            }],
                            mode: store.chatMode,
                            model_id: store.selectedModel || undefined,
                        }),
                    }
                );

                if (!streamRes.ok) {
                    throw new Error(`Stream failed: ${streamRes.status}`);
                }

                // 5. Read the SSE stream and push updates to chatStore
                const reader = streamRes.body?.getReader();
                const decoder = new TextDecoder();

                if (!reader) throw new Error('No response body');

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const event = JSON.parse(data);
                            if (event.type === 'text-delta') {
                                store.appendContent(event.delta || '');
                            } else if (event.type === 'reasoning') {
                                store.appendThinking(event.delta || event.text || '');
                            }
                        } catch {
                            // Skip malformed SSE events
                        }
                    }
                }

                // 6. Done — clean up and refresh
                store.clearStreaming();
                queryClient.invalidateQueries({
                    queryKey: ['chat-messages', sessionId],
                });

                toast.success('Response regenerated');
            } catch (error) {
                console.error('[useRegenerate] Failed:', error);
                useChatStore.getState().clearStreaming();
                toast.error('Failed to regenerate response');
            }
        },
        [sessionId, queryClient]
    );

    return { regenerate };
}
