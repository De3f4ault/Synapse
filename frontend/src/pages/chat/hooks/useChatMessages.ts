/**
 * useChatMessages - Message fetching/sending
 * Manages message operations and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMessagesApiV1ChatSessionsSessionIdMessagesGet,
  sendMessageApiV1ChatSessionsSessionIdMessagesPost,
} from '@/api/generated/services.gen';
import type {
  ChatMessageResponse,
  ChatMessageCreate,
} from '@/api/generated/types.gen';
import { toast } from 'sonner';

/**
 * Hook to fetch messages from a session
 */
export const useChatMessages = (sessionId: number | undefined, limit?: number) => {
  return useQuery<ChatMessageResponse[]>({
    queryKey: ['chat-messages', sessionId, limit],
    queryFn: () =>
    getMessagesApiV1ChatSessionsSessionIdMessagesGet({
      sessionId: sessionId!,
      limit,
    }),
    enabled: !!sessionId,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to send a message (non-streaming)
 * Use this for fallback or when WebSocket is unavailable
 */
export const useSendMessage = (sessionId: number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
    sendMessageApiV1ChatSessionsSessionIdMessagesPost({
      sessionId: sessionId!,
      requestBody: { content },
    }),
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chat-messages', sessionId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<ChatMessageResponse[]>([
        'chat-messages',
        sessionId,
      ]);

      // Optimistically add user message
      if (previousMessages) {
        queryClient.setQueryData<ChatMessageResponse[]>(
          ['chat-messages', sessionId],
          [
            ...previousMessages,
            {
              id: Date.now(),
                                                        session_id: sessionId!,
                                                        role: 'user',
                                                        content,
                                                        tokens: 0,
                                                        model_used: null,
                                                        created_at: new Date().toISOString(),
            } as ChatMessageResponse,
          ]
        );
      }

      return { previousMessages };
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['chat-messages', sessionId],
          context.previousMessages
        );
      }
      toast.error(error.message || 'Failed to send message');
    },
    onSuccess: () => {
      // Invalidate to refetch from server
      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });
};

/**
 * Hook to add a message to local cache (for WebSocket streaming)
 */
export const useAddMessage = (sessionId: number | undefined) => {
  const queryClient = useQueryClient();

  return (message: ChatMessageResponse) => {
    queryClient.setQueryData<ChatMessageResponse[]>(
      ['chat-messages', sessionId],
      (old) => (old ? [...old, message] : [message])
    );
  };
};

/**
 * Hook to update a message in local cache (for streaming updates)
 */
export const useUpdateMessage = (sessionId: number | undefined) => {
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
};
