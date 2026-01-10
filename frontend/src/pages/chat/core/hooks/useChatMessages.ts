/**
 * useChatMessages - Message Fetching Hook
 *
 * INVARIANT:
 * This hook is a THIN ADAPTER over React Query.
 * Messages (persisted) are server-authoritative via React Query.
 * Streaming state is handled separately by chatStore.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatService } from '@/api/generated';
import type { ChatMessageResponse } from '@/api/generated';

/**
 * Hook to fetch messages from a session
 */
export function useChatMessages(sessionId: number | undefined, limit?: number) {
    return useQuery<ChatMessageResponse[]>({
        queryKey: ['chat-messages', sessionId, limit],
        queryFn: () =>
            ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(sessionId!, limit),
        enabled: !!sessionId,
        staleTime: 1000 * 30,
        refetchOnWindowFocus: false,
    });
}

/**
 * Hook to add a message to local cache (for WebSocket streaming)
 */
export function useAddMessage(sessionId: number | undefined) {
    const queryClient = useQueryClient();

    return (message: ChatMessageResponse) => {
        queryClient.setQueryData<ChatMessageResponse[]>(
            ['chat-messages', sessionId],
            (old) => (old ? [...old, message] : [message])
        );
    };
}

/**
 * Hook to update a message in local cache (for streaming updates)
 */
export function useUpdateMessage(sessionId: number | undefined) {
    const queryClient = useQueryClient();

    return (messageId: number, updates: Partial<ChatMessageResponse>) => {
        queryClient.setQueryData<ChatMessageResponse[]>(
            ['chat-messages', sessionId],
            (old) =>
                old?.map((msg) =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                ) || []
        );
    };
}

/**
 * Hook to invalidate messages cache (trigger refetch)
 */
export function useInvalidateMessages(sessionId: number | undefined) {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
    };
}

export default useChatMessages;
