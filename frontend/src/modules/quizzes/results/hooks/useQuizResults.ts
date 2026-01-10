/**
 * useQuizResults - Quiz Results Hook
 *
 * Fetches and manages quiz attempt results and AI insights.
 */

import { useQuery } from "@tanstack/react-query";
import { QuizzesService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import type { AttemptId } from "../../core";
import { getGradeInfo } from "../../core";

/**
 * Hook for fetching quiz results and insights.
 */
export function useQuizResults(attemptId: AttemptId) {
    // =========================================================================
    // Queries
    // =========================================================================

    /**
     * Fetch attempt results.
     */
    const resultsQuery = useQuery({
        queryKey: [...queryKeys.quizzes.all, "attempt", attemptId],
        queryFn: () =>
            QuizzesService.getQuizAttemptApiV1QuizzesAttemptsAttemptIdGet(attemptId),
        enabled: !!attemptId,
    });

    /**
     * Fetch AI insights.
     */
    const insightsQuery = useQuery({
        queryKey: [...queryKeys.quizzes.all, "attempt", attemptId, "insights"],
        queryFn: () =>
            QuizzesService.getQuizAttemptInsightsApiV1QuizzesAttemptsAttemptIdInsightsGet(
                attemptId
            ),
        enabled: !!attemptId && !!resultsQuery.data,
    });

    // =========================================================================
    // Derived Data
    // =========================================================================

    const results = resultsQuery.data;
    const insights = insightsQuery.data;

    // Compute performance summary
    const performance = results
        ? {
            score: Number(results.score),
            percentage: results.percentage,
            rank: getGradeInfo(results.percentage),
            duration: results.time_taken_seconds,
            correctCount: results.answers.filter((a) => a.is_correct).length,
            totalCount: results.answers.length,
        }
        : null;

    // =========================================================================
    // Return
    // =========================================================================

    return {
        // Data
        results,
        insights,
        performance,

        // Loading states
        isLoadingResults: resultsQuery.isLoading,
        isLoadingInsights: insightsQuery.isLoading,

        // Errors
        resultsError: resultsQuery.error,
        insightsError: insightsQuery.error,

        // Utilities
        refetchInsights: insightsQuery.refetch,
    };
}
