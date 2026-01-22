/**
 * Branch Hooks - API integration for branches
 *
 * Uses React Query + generated API or manual fetch.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OpenAPI } from '@/api/generated/core/OpenAPI';
import { request } from '@/api/generated/core/request';
import type { ChatMessageResponse } from '@/api/generated/models/ChatMessageResponse';

// ============================================================================
// Types
// ============================================================================

export interface BranchSiblingInfo {
    id: number;
    is_active: boolean;
    version: number;
    model_used: string | null;
    created_at: string;
    content_preview: string;
}

export interface BranchSiblingsResponse {
    parent_message_id: number;
    total_siblings: number;
    current_index: number;
    siblings: BranchSiblingInfo[];
}

export interface BranchActivateResponse {
    success: boolean;
    activated_id: number;
    deactivated_count: number;
}

export interface CreateBranchParams {
    messageId: number;
    prompt?: string;
    modelOverride?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const branchKeys = {
    all: ['branches'] as const,
    siblings: (messageId: number) => [...branchKeys.all, 'siblings', messageId] as const,
    activePath: (messageId: number) => [...branchKeys.all, 'active-path', messageId] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchSiblings(messageId: number): Promise<BranchSiblingsResponse> {
    return request(OpenAPI, {
        method: 'GET',
        url: '/api/v1/chat/messages/{message_id}/siblings',
        path: { message_id: messageId },
    });
}

async function createBranch(params: CreateBranchParams): Promise<ChatMessageResponse> {
    return request(OpenAPI, {
        method: 'POST',
        url: '/api/v1/chat/messages/{message_id}/branch',
        path: { message_id: params.messageId },
        body: {
            prompt: params.prompt,
            model_override: params.modelOverride,
        },
    });
}

async function activateBranch(messageId: number): Promise<BranchActivateResponse> {
    return request(OpenAPI, {
        method: 'PATCH',
        url: '/api/v1/chat/messages/{message_id}/activate',
        path: { message_id: messageId },
    });
}

async function fetchActivePath(messageId: number): Promise<ChatMessageResponse[]> {
    return request(OpenAPI, {
        method: 'GET',
        url: '/api/v1/chat/messages/{message_id}/active-path',
        path: { message_id: messageId },
    });
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get sibling branches for a message.
 */
export function useBranchSiblings(messageId: number | undefined) {
    return useQuery({
        queryKey: branchKeys.siblings(messageId!),
        queryFn: () => fetchSiblings(messageId!),
        enabled: !!messageId,
        staleTime: 5_000, // 5 seconds - siblings don't change often
    });
}

/**
 * Get the active conversation path.
 */
export function useActivePath(messageId: number | undefined) {
    return useQuery({
        queryKey: branchKeys.activePath(messageId!),
        queryFn: () => fetchActivePath(messageId!),
        enabled: !!messageId,
    });
}

/**
 * Create a new branch.
 */
export function useCreateBranch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createBranch,
        onSuccess: (_newMessage, params) => {
            // Invalidate siblings query
            queryClient.invalidateQueries({
                queryKey: branchKeys.siblings(params.messageId),
            });
            // The new branch is returned, caller can use it
        },
    });
}

/**
 * Activate a branch (switch to it).
 */
export function useActivateBranch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: activateBranch,
        onSuccess: () => {
            // Invalidate all branch-related queries since active state changed
            queryClient.invalidateQueries({
                queryKey: branchKeys.all,
            });
            // Also invalidate chat messages to refresh the view
            queryClient.invalidateQueries({
                queryKey: ['chatMessages'],
            });
        },
    });
}

/**
 * Helper hook that combines siblings query with navigation actions.
 *
 * Returns everything needed for BranchNavigator component.
 */
export function useBranchNavigation(messageId: number | undefined) {
    const siblingsQuery = useBranchSiblings(messageId);
    const activateMutation = useActivateBranch();

    const data = siblingsQuery.data;
    const currentIndex = data?.current_index ?? 1;
    const totalBranches = data?.total_siblings ?? 1;
    const siblings = data?.siblings ?? [];

    const goToPrev = () => {
        if (currentIndex > 1 && siblings.length > 0) {
            const prevSibling = siblings[currentIndex - 2]; // 0-indexed
            if (prevSibling) {
                activateMutation.mutate(prevSibling.id);
            }
        }
    };

    const goToNext = () => {
        if (currentIndex < totalBranches && siblings.length > 0) {
            const nextSibling = siblings[currentIndex]; // current is 1-indexed
            if (nextSibling) {
                activateMutation.mutate(nextSibling.id);
            }
        }
    };

    const goToIndex = (index: number) => {
        if (index >= 1 && index <= totalBranches && siblings.length > 0) {
            const targetSibling = siblings[index - 1];
            if (targetSibling && !targetSibling.is_active) {
                activateMutation.mutate(targetSibling.id);
            }
        }
    };

    return {
        currentIndex,
        totalBranches,
        siblings,
        isLoading: siblingsQuery.isLoading,
        isSwitching: activateMutation.isPending,
        goToPrev,
        goToNext,
        goToIndex,
        hasBranches: totalBranches > 1,
    };
}
