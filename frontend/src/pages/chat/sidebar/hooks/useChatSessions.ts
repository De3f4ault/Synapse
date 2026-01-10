/**
 * useChatSessions - Session CRUD Hooks
 *
 * INVARIANT:
 * Sessions are server-authoritative.
 * This hook is a THIN ADAPTER over React Query.
 * No local state ownership - just wiring.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChatService } from '@/api/generated';
import type {
    ChatSessionResponse,
    ChatSessionCreate,
    ChatSessionUpdate,
} from '@/api/generated';
import { toast } from 'sonner';

// ==================== QUERY KEYS ====================

export const sessionKeys = {
    all: ['chat-sessions'] as const,
    list: (params?: { page?: number; pageSize?: number }) =>
        ['chat-sessions', params] as const,
    detail: (id: number) => ['chat-session', id] as const,
    messages: (id: number) => ['chat-messages', id] as const,
};

// ==================== QUERIES ====================

/**
 * List all sessions
 */
export function useChatSessions(params?: { page?: number; pageSize?: number }) {
    return useQuery<ChatSessionResponse[]>({
        queryKey: sessionKeys.list(params),
        queryFn: async () => {
            const page = params?.page ?? 1;
            const pageSize = params?.pageSize ?? 20;
            return ChatService.listSessionsApiV1ChatSessionsGet(page, pageSize);
        },
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
    });
}

/**
 * Get single session
 */
export function useChatSession(sessionId: number | undefined) {
    return useQuery<ChatSessionResponse>({
        queryKey: sessionKeys.detail(sessionId!),
        queryFn: () =>
            ChatService.getSessionApiV1ChatSessionsSessionIdGet(sessionId!),
        enabled: !!sessionId,
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
    });
}

// ==================== MUTATIONS ====================

/**
 * Create session
 */
export function useCreateSession() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: ChatSessionCreate) =>
            ChatService.createSessionApiV1ChatSessionsPost(data),
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.all });
            toast.success('New conversation started');
            navigate(`/chat/${session.id}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create session');
        },
    });
}

/**
 * Update session (rename)
 */
export function useUpdateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            sessionId,
            data,
        }: {
            sessionId: number;
            data: ChatSessionUpdate;
        }) =>
            ChatService.updateSessionApiV1ChatSessionsSessionIdPatch(sessionId, data),
        onSuccess: (_, { sessionId }) => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.all });
            queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
            toast.success('Session updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update session');
        },
    });
}

/**
 * Delete session
 */
export function useDeleteSession() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (sessionId: number) =>
            ChatService.deleteSessionApiV1ChatSessionsSessionIdDelete(sessionId),
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.all });
            queryClient.removeQueries({ queryKey: sessionKeys.detail(sessionId) });
            queryClient.removeQueries({ queryKey: sessionKeys.messages(sessionId) });
            toast.success('Conversation deleted');
            navigate('/chat');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete session');
        },
    });
}
