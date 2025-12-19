/**
 * useChatSession - Session CRUD operations
 * Manages chat session creation, retrieval, and deletion
 *
 * Location: frontend/src/pages/chat/hooks/useChatSession.ts
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

/**
 * Hook to list all chat sessions
 */
export const useChatSessions = (params?: { page?: number; pageSize?: number }) => {
  return useQuery<ChatSessionResponse[]>({
    queryKey: ['chat-sessions', params],
    queryFn: async () => {
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 20;
      return ChatService.listSessionsApiV1ChatSessionsGet(page, pageSize);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to get a specific chat session
 */
export const useChatSession = (sessionId: number | undefined) => {
  return useQuery<ChatSessionResponse>({
    queryKey: ['chat-session', sessionId],
    queryFn: () => ChatService.getSessionApiV1ChatSessionsSessionIdGet(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to create a new chat session
 */
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ChatSessionCreate) => ChatService.createSessionApiV1ChatSessionsPost(data),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      toast.success('New conversation started');
      navigate(`/chat/${session.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create session');
    },
  });
};

/**
 * Hook to update a chat session (e.g. rename)
 */
export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: ChatSessionUpdate }) =>
      ChatService.updateSessionApiV1ChatSessionsSessionIdPatch(sessionId, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
      toast.success('Session updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update session');
    },
  });
};

/**
 * Hook to delete a chat session
 */
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (sessionId: number) => ChatService.deleteSessionApiV1ChatSessionsSessionIdDelete(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.removeQueries({ queryKey: ['chat-session', sessionId] });
      queryClient.removeQueries({ queryKey: ['chat-messages', sessionId] });
      toast.success('Conversation deleted');
      navigate('/chat');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete session');
    },
  });
};
