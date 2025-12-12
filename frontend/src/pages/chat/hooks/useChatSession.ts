/**
 * useChatSession - Session CRUD operations
 * Manages chat session creation, retrieval, and deletion
 *
 * Location: frontend/src/pages/chat/hooks/useChatSession.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  listSessionsApiV1ChatSessionsGet,
  createSessionApiV1ChatSessionsPost,
  getSessionApiV1ChatSessionsSessionIdGet,
  deleteSessionApiV1ChatSessionsSessionIdDelete,
} from '@/api/generated/services.gen';
import type {
  ChatSessionResponse,
  ChatSessionCreate,
} from '@/api/generated/types.gen';
import { toast } from 'sonner';

/**
 * Hook to list all chat sessions
 */
export const useChatSessions = (params?: { page?: number; pageSize?: number }) => {
  return useQuery<ChatSessionResponse[]>({
    queryKey: ['chat-sessions', params],
    queryFn: async () => {
      const response = await listSessionsApiV1ChatSessionsGet({
        query: params ? { page: params.page, page_size: params.pageSize } : undefined
      });
      // Extract data from @hey-api/client-fetch wrapper
      const data = (response as any).data ?? response;
      // Handle both direct array and paginated response
      return Array.isArray(data) ? data : (data as any).items || [];
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
    queryFn: async () => {
      const response = await getSessionApiV1ChatSessionsSessionIdGet({ path: { session_id: sessionId! } });
      return (response as any).data ?? response;
    },
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
    mutationFn: async (data: ChatSessionCreate) => {
      const response = await createSessionApiV1ChatSessionsPost({ body: data });
      return (response as any).data ?? response;
    },
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
 * Hook to delete a chat session
 */
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (sessionId: number) =>
      deleteSessionApiV1ChatSessionsSessionIdDelete({ path: { session_id: sessionId } }),
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
