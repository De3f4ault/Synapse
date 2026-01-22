/**
 * Thread Hooks - API integration for threads
 *
 * Uses React Query + generated ChatThreadsService.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatThreadsService } from '@/api/generated/services/ChatThreadsService';
import type { ThreadResponse } from '@/api/generated/models/ThreadResponse';
import type { ThreadInfo } from '../state/threadStore';

// ============================================================================
// Type Conversion Helper
// ============================================================================

/**
 * Convert API ThreadResponse to our ThreadInfo type.
 * Handles snake_case to camelCase conversion.
 */
function toThreadInfo(response: ThreadResponse): ThreadInfo {
    return {
        id: response.id,
        sessionId: response.session_id,
        title: response.title,
        summary: response.summary ?? undefined,
        messageCount: response.message_count,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
    };
}

// ============================================================================
// Query Keys
// ============================================================================

export const threadKeys = {
    all: ['threads'] as const,
    lists: () => [...threadKeys.all, 'list'] as const,
    list: (sessionId: number) => [...threadKeys.lists(), sessionId] as const,
    detail: (threadId: number) => [...threadKeys.all, 'detail', threadId] as const,
    messages: (threadId: number) => [...threadKeys.all, 'messages', threadId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch threads for a session.
 */
export function useThreads(sessionId: number | undefined) {
    return useQuery({
        queryKey: threadKeys.list(sessionId!),
        queryFn: async () => {
            const response = await ChatThreadsService.listThreadsApiV1ChatSessionsSessionIdThreadsGet(
                sessionId!
            );
            return {
                threads: response.threads.map(toThreadInfo),
                total: response.total,
            };
        },
        enabled: !!sessionId,
        staleTime: 30_000, // 30 seconds
    });
}

/**
 * Fetch a single thread.
 */
export function useThread(threadId: number | undefined) {
    return useQuery({
        queryKey: threadKeys.detail(threadId!),
        queryFn: async () => {
            const response = await ChatThreadsService.getThreadApiV1ChatThreadsThreadIdGet(
                threadId!
            );
            return toThreadInfo(response);
        },
        enabled: !!threadId,
    });
}

/**
 * Fetch messages for a thread.
 */
export function useThreadMessages(threadId: number | undefined) {
    return useQuery({
        queryKey: threadKeys.messages(threadId!),
        queryFn: async () => {
            return await ChatThreadsService.getThreadMessagesApiV1ChatThreadsThreadIdMessagesGet(
                threadId!
            );
        },
        enabled: !!threadId,
    });
}

// ============================================================================
// Mutations
// ============================================================================

interface CreateThreadParams {
    sessionId: number;
    rootMessageId?: number;
    title?: string;
}

interface UpdateThreadParams {
    threadId: number;
    title?: string;
    summary?: string;
}

/**
 * Create a new thread.
 */
export function useCreateThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sessionId, rootMessageId, title }: CreateThreadParams) => {
            const response = await ChatThreadsService.createThreadApiV1ChatSessionsSessionIdThreadsPost(
                sessionId,
                {
                    session_id: sessionId,
                    root_message_id: rootMessageId ?? null,
                    title: title ?? null,
                }
            );
            return toThreadInfo(response);
        },
        onSuccess: (newThread) => {
            // Invalidate threads list
            queryClient.invalidateQueries({
                queryKey: threadKeys.list(newThread.sessionId),
            });
        },
    });
}

/**
 * Update a thread.
 */
export function useUpdateThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ threadId, title, summary }: UpdateThreadParams) => {
            const response = await ChatThreadsService.updateThreadApiV1ChatThreadsThreadIdPatch(
                threadId,
                { title, summary }
            );
            return toThreadInfo(response);
        },
        onSuccess: (updatedThread) => {
            // Update cache
            queryClient.setQueryData(
                threadKeys.detail(updatedThread.id),
                updatedThread
            );
            // Invalidate list
            queryClient.invalidateQueries({
                queryKey: threadKeys.list(updatedThread.sessionId),
            });
        },
    });
}

/**
 * Delete a thread.
 */
export function useDeleteThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ threadId, sessionId }: { threadId: number; sessionId: number }) => {
            await ChatThreadsService.deleteThreadApiV1ChatThreadsThreadIdDelete(threadId);
            return { threadId, sessionId };
        },
        onSuccess: ({ threadId, sessionId }) => {
            // Remove from cache
            queryClient.removeQueries({
                queryKey: threadKeys.detail(threadId),
            });
            // Invalidate list
            queryClient.invalidateQueries({
                queryKey: threadKeys.list(sessionId),
            });
        },
    });
}

/**
 * Send a message in a thread.
 */
export function useSendThreadMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ threadId, content }: { threadId: number; content: string }) => {
            return await ChatThreadsService.createThreadMessageApiV1ChatThreadsThreadIdMessagesPost(
                threadId,
                { content }
            );
        },
        onSuccess: (_, { threadId }) => {
            // Invalidate thread messages
            queryClient.invalidateQueries({
                queryKey: threadKeys.messages(threadId),
            });
        },
    });
}
