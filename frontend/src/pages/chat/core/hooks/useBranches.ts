/**
 * Branch Hooks - Navigation between message versions (regenerations).
 *
 * Uses the conversation tree API to discover sibling messages
 * and the switch-branch endpoint to navigate between them.
 *
 * API endpoints used:
 * - GET /api/v1/chat/sessions/{id}/tree?include_inactive=true
 * - POST /api/v1/chat/messages/{id}/switch-branch
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OpenAPI } from '@/api/generated/core/OpenAPI';

// ============================================================================
// Types
// ============================================================================

export interface BranchSiblingInfo {
    id: number;
    is_active: boolean;
    version: number;
    role: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const branchKeys = {
    all: ['branches'] as const,
    siblings: (sessionId: number, messageId: number) =>
        [...branchKeys.all, 'siblings', sessionId, messageId] as const,
};

// ============================================================================
// API Functions (direct fetch — endpoints not in generated client)
// ============================================================================

async function fetchConversationTree(sessionId: number) {
    const base = OpenAPI.BASE || '';
    const token = typeof OpenAPI.TOKEN === 'function'
        ? await OpenAPI.TOKEN({} as any)
        : OpenAPI.TOKEN;
    const res = await fetch(
        `${base}/api/v1/chat/sessions/${sessionId}/tree?include_inactive=true`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Tree fetch failed: ${res.status}`);
    return res.json();
}

async function switchBranch(messageId: number) {
    const base = OpenAPI.BASE || '';
    const token = typeof OpenAPI.TOKEN === 'function'
        ? await OpenAPI.TOKEN({} as any)
        : OpenAPI.TOKEN;
    const res = await fetch(
        `${base}/api/v1/chat/messages/${messageId}/switch-branch`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Switch branch failed: ${res.status}`);
    return res.json();
}

// ============================================================================
// Core Hook: Fetch siblings for a specific message
// ============================================================================

function useSiblings(sessionId: number, messageId: number | undefined) {
    return useQuery({
        queryKey: branchKeys.siblings(sessionId, messageId!),
        queryFn: async () => {
            const tree = await fetchConversationTree(sessionId);
            if (!tree?.messages) return null;

            // Find the current message
            const currentMsg = tree.messages.find((m: any) => m.id === messageId);
            if (!currentMsg?.parent_message_id) return null;

            // Gather siblings: same parent + same role
            const siblings: BranchSiblingInfo[] = tree.messages
                .filter((m: any) =>
                    m.parent_message_id === currentMsg.parent_message_id &&
                    m.role === currentMsg.role
                )
                .sort((a: any, b: any) => a.id - b.id)
                .map((m: any) => ({
                    id: m.id,
                    is_active: m.is_active,
                    version: m.version,
                    role: m.role,
                }));

            if (siblings.length <= 1) return null;

            // Find current index (1-indexed for display)
            const idx = siblings.findIndex((s) => s.id === messageId);
            return {
                siblings,
                current_index: idx >= 0 ? idx + 1 : siblings.length,
                total_siblings: siblings.length,
            };
        },
        enabled: !!messageId && !!sessionId,
        staleTime: 10_000, // 10s - siblings rarely change mid-session
    });
}

// ============================================================================
// Activate branch mutation
// ============================================================================

export function useActivateBranch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: switchBranch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: branchKeys.all });
            queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        },
    });
}

/**
 * Create a new branch via WebSocket streaming.
 *
 * Sends a 'branch' event through the unified WebSocket.
 * The streaming response comes through useChatStreaming.
 */
export function useCreateBranch(sessionId?: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { messageId: number; prompt?: string; model_override?: string }) => {
            const { getWebSocketManager } = await import('@/api/websocket/manager');
            const manager = getWebSocketManager();

            if (!manager.isConnected()) {
                throw new Error('WebSocket not connected');
            }

            const channel = sessionId ? `chat:${sessionId}` : '';
            if (!channel) {
                throw new Error('No session ID for branch');
            }

            manager.send({
                type: 'branch',
                channel,
                messageId: params.messageId,
                prompt: params.prompt,
                model_override: params.model_override,
            });

            // Resolve immediately — streaming comes via useChatStreaming
            return { messageId: params.messageId };
        },
        onSuccess: (_result, params) => {
            queryClient.invalidateQueries({
                queryKey: branchKeys.siblings(sessionId ?? 0, params.messageId),
            });
        },
    });
}

// ============================================================================
// Composite hook for BranchNavigator
// ============================================================================

/**
 * useBranchNavigation — Returns everything needed for the `< 1/2 >` navigator.
 *
 * Combines sibling discovery with switch-branch actions.
 */
export function useBranchNavigation(
    messageId: number | undefined,
    sessionId?: number,
) {
    const effectiveSessionId = sessionId ?? 0;
    const siblingsQuery = useSiblings(effectiveSessionId, messageId);
    const activateMutation = useActivateBranch();

    const data = siblingsQuery.data;
    const currentIndex = data?.current_index ?? 1;
    const totalBranches = data?.total_siblings ?? 1;
    const siblings = data?.siblings ?? [];

    const goToPrev = () => {
        if (currentIndex > 1 && siblings.length > 0) {
            const prevSibling = siblings[currentIndex - 2]; // convert to 0-indexed
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

    return {
        currentIndex,
        totalBranches,
        siblings,
        isLoading: siblingsQuery.isLoading,
        isSwitching: activateMutation.isPending,
        goToPrev,
        goToNext,
        hasBranches: totalBranches > 1,
    };
}
