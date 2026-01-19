/**
 * useRelatedFlashcards — Hook for Semantic Neighbors
 *
 * Phase Q3.1: Fetches flashcards semantically related to a quiz question.
 * Advisory only, used after quiz difficulty to surface review opportunities.
 */

import { useQuery } from "@tanstack/react-query";
import { getRelatedFlashcards, type RelatedFlashcard } from "../../core/learningApi";

const QUERY_KEY_PREFIX = "related-flashcards";

interface UseRelatedFlashcardsOptions {
    questionId: number;
    enabled?: boolean;
    limit?: number;
}

interface UseRelatedFlashcardsReturn {
    flashcards: RelatedFlashcard[];
    isLoading: boolean;
    error: Error | null;
    advisoryMessage: string | null;
}

/**
 * Fetch related flashcards for a quiz question.
 *
 * @param options.questionId - The quiz question ID
 * @param options.enabled - Whether to enable the query (default: true)
 * @param options.limit - Max flashcards to fetch (default: 5)
 */
export function useRelatedFlashcards({
    questionId,
    enabled = true,
    limit = 5,
}: UseRelatedFlashcardsOptions): UseRelatedFlashcardsReturn {
    const query = useQuery({
        queryKey: [QUERY_KEY_PREFIX, questionId, limit],
        queryFn: () => getRelatedFlashcards(questionId, limit),
        enabled: enabled && questionId > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });

    return {
        flashcards: query.data?.flashcards ?? [],
        isLoading: query.isLoading,
        error: query.error ?? null,
        advisoryMessage: query.data?.advisory_message ?? null,
    };
}
