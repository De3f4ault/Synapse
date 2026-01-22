/**
 * useRegenerate — Hook for regenerating AI responses
 *
 * Calls REST endpoint to regenerate a message.
 * Invalidates message cache on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatMessageResponse } from '@/api/generated';
import { toast } from 'sonner';

interface UseRegenerateOptions {
    /** Session ID for cache invalidation */
    sessionId: number;

    /** Callback on success */
    onSuccess?: (message: ChatMessageResponse) => void;
}

export function useRegenerate({ sessionId, onSuccess }: UseRegenerateOptions) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (messageId: number): Promise<ChatMessageResponse> => {
            const response = await fetch(`/api/v1/chat/messages/${messageId}/regenerate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to regenerate');
            }

            return response.json();
        },
        onSuccess: (data) => {
            // Invalidate message cache to show updated content
            queryClient.invalidateQueries({
                queryKey: ['chat-messages', sessionId],
            });

            toast.success('Response regenerated');
            onSuccess?.(data);
        },
        onError: (error: Error) => {
            toast.error(`Failed to regenerate: ${error.message}`);
        },
    });
}
