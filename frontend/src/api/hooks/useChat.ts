// Chat hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatService } from "../generated";
import type {
  ChatSessionResponse,
  ChatSessionCreate,
  ChatMessageResponse,
  ChatMessageCreate,
} from "../generated";

const CHAT_KEYS = {
  sessions: () => ["chat", "sessions"] as const,
  session: (id: number) => ["chat", "session", id] as const,
  messages: (sessionId: number) => ["chat", "messages", sessionId] as const,
};

/**
 * Hook to list chat sessions
 */
export const useChatSessions = (params?: {
  page?: number;
  pageSize?: number;
}) => {
  return useQuery<ChatSessionResponse[]>({
    queryKey: CHAT_KEYS.sessions(),
    queryFn: () =>
      ChatService.listSessionsApiV1ChatSessionsGet(
        params?.page,
        params?.pageSize,
      ),
  });
};

/**
 * Hook to get a specific chat session
 */
export const useChatSession = (sessionId: number) => {
  return useQuery<ChatSessionResponse>({
    queryKey: CHAT_KEYS.session(sessionId),
    queryFn: () =>
      ChatService.getSessionApiV1ChatSessionsSessionIdGet(sessionId),
    enabled: !!sessionId,
  });
};

/**
 * Hook to get messages from a chat session
 */
export const useChatMessages = (sessionId: number, limit?: number) => {
  return useQuery<ChatMessageResponse[]>({
    queryKey: CHAT_KEYS.messages(sessionId),
    queryFn: () =>
      ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(
        sessionId,
        limit,
      ),
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
      ChatService.createSessionApiV1ChatSessionsPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.sessions() });
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
      ChatService.sendMessageApiV1ChatSessionsSessionIdMessagesPost(sessionId, {
        content,
      } as ChatMessageCreate),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.messages(variables.sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: CHAT_KEYS.session(variables.sessionId),
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
      ChatService.deleteSessionApiV1ChatSessionsSessionIdDelete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.sessions() });
    },
  });
};

// Empty useChat for compatibility
export function useChat() {
  return {};
}
