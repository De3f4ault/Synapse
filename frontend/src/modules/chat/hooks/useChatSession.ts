/**
 * useChatSession - Session CRUD operations
 * Manages chat session creation, retrieval, and deletion
 *
 * Location: frontend/src/modules/chat/hooks/useChatSession.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChatService } from "@/api/generated";
import type {
    ChatSessionResponse,
    ChatSessionCreate,
    ChatSessionUpdate,
} from "@/api/generated";
import { toast } from "sonner";

/**
 * Hook to list all chat sessions
 * 
 * OPTIMIZED: Balanced caching per TanStack Query v5 best practices.
 * - staleTime: 30s (data considered fresh)
 * - gcTime: 5min (inactive data cached)
 */
export const useChatSessions = (params?: {
    page?: number;
    pageSize?: number;
}) => {
    return useQuery<ChatSessionResponse[]>({
        queryKey: ["chat-sessions", params],
        queryFn: async () => {
            const page = params?.page ?? 1;
            const pageSize = params?.pageSize ?? 20;
            return ChatService.listSessionsApiV1ChatSessionsGet(page, pageSize);
        },
        staleTime: 1000 * 30,       // 30 seconds (fresh window)
        gcTime: 1000 * 60 * 5,      // 5 minutes (garbage collection)
        refetchOnWindowFocus: true, // Refetch when user returns to tab
    });
};

/**
 * Hook to get a specific chat session
 * 
 * OPTIMIZED: Same caching strategy as list.
 */
export const useChatSession = (sessionId: number | undefined) => {
    return useQuery<ChatSessionResponse>({
        queryKey: ["chat-session", sessionId],
        queryFn: () =>
            ChatService.getSessionApiV1ChatSessionsSessionIdGet(sessionId!),
        enabled: !!sessionId,
        staleTime: 1000 * 30,       // 30 seconds
        gcTime: 1000 * 60 * 5,      // 5 minutes
    });
};

/**
 * Hook to create a new chat session
 * @param options.autoNavigate - Whether to navigate to the new session after creation (default: true)
 */
export const useCreateSession = (options?: { autoNavigate?: boolean }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const autoNavigate = options?.autoNavigate ?? true;

    return useMutation({
        mutationFn: (data: ChatSessionCreate) =>
            ChatService.createSessionApiV1ChatSessionsPost(data),
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
            toast.success("New conversation started");
            if (autoNavigate) {
                navigate(`/chat/${session.id}`);
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create session");
        },
    });
};

/**
 * Hook to update a chat session (e.g. rename)
 */
export const useUpdateSession = () => {
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
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
            toast.success("Session updated");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update session");
        },
    });
};

/**
 * Hook to delete a chat session
 * @param options.autoNavigate - Whether to navigate to /chat after deletion (default: true)
 */
export const useDeleteSession = (options?: { autoNavigate?: boolean }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const autoNavigate = options?.autoNavigate ?? true;

    return useMutation({
        mutationFn: (sessionId: number) =>
            ChatService.deleteSessionApiV1ChatSessionsSessionIdDelete(sessionId),
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
            queryClient.removeQueries({ queryKey: ["chat-session", sessionId] });
            queryClient.removeQueries({ queryKey: ["chat-messages", sessionId] });
            toast.success("Conversation deleted");
            if (autoNavigate) {
                navigate("/chat");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete session");
        },
    });
};
