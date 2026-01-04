/**
 * useQuizHub - Quiz Discovery & Creation Hook
 *
 * Manages state for the quiz hub/listing view.
 * Uses generated API client exclusively.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuizzesService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { QuizGenerateRequest } from "@/api/generated";

/**
 * Hook for quiz hub operations.
 */
export function useQuizHub() {
    const queryClient = useQueryClient();

    // =========================================================================
    // Queries
    // =========================================================================

    /**
     * Fetch all quizzes for the current user.
     */
    const quizzesQuery = useQuery({
        queryKey: queryKeys.quizzes.list(),
        queryFn: () => QuizzesService.listQuizzesApiV1QuizzesGet(),
    });

    // =========================================================================
    // Mutations
    // =========================================================================

    /**
     * Generate a quiz using AI.
     * Uses the generated client method.
     */
    const generateQuizMutation = useMutation({
        mutationFn: (request: QuizGenerateRequest) =>
            QuizzesService.generateQuizApiV1QuizzesGeneratePost(request),
        onSuccess: (data) => {
            toast.success("Quiz Generated!", {
                description: `Created "${data.title}" with ${data.question_count} questions.`,
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
        },
        onError: (error: Error) => {
            toast.error("Generation Failed", {
                description: error.message,
            });
        },
    });

    // =========================================================================
    // Public API
    // =========================================================================

    return {
        // Data
        quizzes: quizzesQuery.data ?? [],
        isLoading: quizzesQuery.isLoading,
        error: quizzesQuery.error,

        // Actions
        generateQuiz: generateQuizMutation.mutate,
        isGenerating: generateQuizMutation.isPending,

        // Utilities
        refetch: quizzesQuery.refetch,
    };
}
