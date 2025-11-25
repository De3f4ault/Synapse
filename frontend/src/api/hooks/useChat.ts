// Chat hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    listSessionsApiV1ChatSessionsGet,
    createSessionApiV1ChatSessionsPost,
    getSessionApiV1ChatSessionsSessionIdGet,
    deleteSessionApiV1ChatSessionsSessionIdDelete,
    getMessagesApiV1ChatSessionsSessionIdMessagesGet,
    sendMessageApiV1ChatSessionsSessionIdMessagesPost,
} from '../generated';
import type {
    ChatSessionResponse,
    ChatSessionCreate,
    ChatMessageResponse,
    ChatMessageCreate,
} from '../generated';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to list chat sessions
 */
export const useChatSessions = (params?: {
    page?: number;
    pageSize?: number;
}) => {
    return useQuery<ChatSessionResponse[]>({
        // FIX 5: renamed sessionsList -> sessions
        queryKey: queryKeys.chat.sessions(),
                                           queryFn: () => listSessionsApiV1ChatSessionsGet(params || {}),
    });
};

/**
 * Hook to get a specific chat session
 */
export const useChatSession = (sessionId: number) => {
    return useQuery<ChatSessionResponse>({
        queryKey: queryKeys.chat.session(sessionId),
                                         queryFn: () => getSessionApiV1ChatSessionsSessionIdGet({ sessionId }),
                                         enabled: !!sessionId,
    });
};

/**
 * Hook to get messages from a chat session
 */
export const useChatMessages = (sessionId: number, limit?: number) => {
    return useQuery<ChatMessageResponse[]>({
        queryKey: queryKeys.chat.messages(sessionId),
                                           queryFn: () =>
                                           getMessagesApiV1ChatSessionsSessionIdMessagesGet({ sessionId, limit }),
                                           enabled: !!sessionId,
    });
};

/**
 * Hook to create a new chat session
 */
export const useCreateChatSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ChatSessionCreate) =>
        createSessionApiV1ChatSessionsPost({ requestBody: data }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions() });
                       },
    });
};

/**
 * Hook to send a message (non-streaming)
 */
export const useSendMessage = () => {
    const queryClient = useQueryClient();

    return useMutation<
    ChatMessageResponse,
    Error,
    { sessionId: number; content: string }
    >({
        mutationFn: ({ sessionId, content }) =>
        sendMessageApiV1ChatSessionsSessionIdMessagesPost({
            sessionId,
            requestBody: { content },
        }),
        onSuccess: (_, variables) => {
            // Invalidate messages for this session
            queryClient.invalidateQueries({
                queryKey: queryKeys.chat.messages(variables.sessionId),
            });
            // Invalidate session to update message count
            queryClient.invalidateQueries({
                queryKey: queryKeys.chat.session(variables.sessionId),
            });
        },
    });
};

/**
 * Hook to delete a chat session
 */
export const useDeleteChatSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: number) =>
        deleteSessionApiV1ChatSessionsSessionIdDelete({ sessionId }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions() });
                       },
    });
};
