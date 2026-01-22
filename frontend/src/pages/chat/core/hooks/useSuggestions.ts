/**
 * useSuggestions - React hook for suggestion management
 *
 * Integrates suggestion engine with React state.
 * Manages dismissal of suggestions (ephemeral, not persisted).
 */

import { useMemo, useCallback, useState } from 'react';
import type { ChatMessageResponse } from '@/api/generated';
import {
    generateSuggestions,
    filterDismissed,
    deduplicateSuggestions,
    type SuggestionSignal,
    type ChatMessageLike,
} from '../../suggestions';

interface UseSuggestionsOptions {
    /** Current session ID */
    sessionId: number;

    /** Current thread ID (if in a thread) */
    threadId?: number;

    /** Messages in the conversation */
    messages: ChatMessageResponse[];

    /** Root embedding (for semantic drift detection) */
    rootEmbedding?: number[];

    /** Latest message embedding */
    latestEmbedding?: number[];

    /** Whether to enable suggestions */
    enabled?: boolean;
}

interface UseSuggestionsResult {
    /** Active suggestions to display */
    suggestions: SuggestionSignal[];

    /** Dismiss a suggestion */
    dismiss: (suggestion: SuggestionSignal) => void;

    /** Clear all dismissals */
    clearDismissals: () => void;

    /** Count of dismissed suggestions in this session */
    dismissedCount: number;
}

/**
 * Hook to generate and manage suggestions.
 *
 * Suggestions are computed on the fly from message state.
 * Dismissals are tracked in component state (not persisted).
 */
export function useSuggestions({
    sessionId,
    threadId,
    messages,
    rootEmbedding,
    latestEmbedding,
    enabled = true,
}: UseSuggestionsOptions): UseSuggestionsResult {
    // Track dismissed suggestions by anchor message ID
    const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

    // Convert ChatMessageResponse to engine format
    const messageLike: ChatMessageLike[] = useMemo(
        () =>
            messages.map((m) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content || '',
                thread_id: null, // Could be enhanced with actual thread_id
            })),
        [messages]
    );

    // Generate suggestions from context
    const rawSuggestions = useMemo(() => {
        if (!enabled || messages.length < 2) {
            return [];
        }

        return generateSuggestions({
            sessionId,
            threadId,
            messages: messageLike,
            embeddings:
                rootEmbedding && latestEmbedding
                    ? { root: rootEmbedding, latest: latestEmbedding }
                    : undefined,
        });
    }, [sessionId, threadId, messageLike, rootEmbedding, latestEmbedding, enabled, messages.length]);

    // Filter out dismissed and deduplicate
    const suggestions = useMemo(() => {
        const filtered = filterDismissed(rawSuggestions, dismissedIds);
        return deduplicateSuggestions(filtered);
    }, [rawSuggestions, dismissedIds]);

    // Dismiss handler
    const dismiss = useCallback((suggestion: SuggestionSignal) => {
        setDismissedIds((prev) => {
            const next = new Set(prev);
            next.add(suggestion.anchorMessageId);
            return next;
        });
    }, []);

    // Clear all dismissals
    const clearDismissals = useCallback(() => {
        setDismissedIds(new Set());
    }, []);

    return {
        suggestions,
        dismiss,
        clearDismissals,
        dismissedCount: dismissedIds.size,
    };
}
