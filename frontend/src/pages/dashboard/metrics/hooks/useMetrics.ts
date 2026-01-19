/**
 * useMetrics - Hook for consuming dashboard metrics
 * 
 * This hook provides read-only access to metrics data computed from
 * various domain modules. Includes both flashcard AND quiz metrics
 * for hybrid dashboard display.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { AnalyticsService } from "@/api/generated";

export interface DashboardMetrics {
    // Combined metrics
    totalStudyTimeMinutes: number;
    accuracy: number;  // Overall weighted accuracy
    streakDays: number;
    totalLearningEvents: number;
    
    // Flashcard-specific metrics
    dueCards: number;
    totalCards: number;
    cardsReviewedToday: number;
    totalDecks: number;
    flashcardAccuracy: number;
    flashcardStudyTimeMinutes: number;
    totalFlashcardReviews: number;
    
    // Quiz-specific metrics
    totalQuizzes: number;
    totalQuizAttempts: number;
    quizAccuracy: number;
    quizStudyTimeMinutes: number;
}

export function useMetrics() {
    const overviewQuery = useQuery({
        queryKey: queryKeys.analytics.overview(),
        queryFn: () => AnalyticsService.getOverviewApiV1AnalyticsOverviewGet(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const metrics = useMemo<DashboardMetrics | undefined>(() => {
        if (!overviewQuery.data) return undefined;

        // Cast as any to access new quiz fields that may not be in generated types yet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = overviewQuery.data as any;
        return {
            // Combined metrics
            totalStudyTimeMinutes: data.total_study_time_minutes ?? 0,
            accuracy: data.overall_accuracy ?? 0,
            streakDays: data.study_streak_days ?? 0,
            totalLearningEvents: data.total_learning_events ?? data.learning_event_count ?? 0,
            
            // Flashcard-specific
            dueCards: data.due_cards ?? 0,
            totalCards: data.total_cards ?? 0,
            cardsReviewedToday: data.cards_reviewed_today ?? 0,
            totalDecks: data.total_decks ?? 0,
            flashcardAccuracy: data.flashcard_accuracy ?? data.overall_accuracy ?? 0,
            flashcardStudyTimeMinutes: data.flashcard_study_time_minutes ?? 0,
            totalFlashcardReviews: data.total_flashcard_reviews ?? 0,
            
            // Quiz-specific
            totalQuizzes: data.total_quizzes ?? 0,
            totalQuizAttempts: data.total_quiz_attempts ?? 0,
            quizAccuracy: data.quiz_accuracy ?? 0,
            quizStudyTimeMinutes: data.quiz_study_time_minutes ?? 0,
        };
    }, [overviewQuery.data]);

    return {
        metrics,
        isLoading: overviewQuery.isLoading,
        error: overviewQuery.error,
        refetch: overviewQuery.refetch,
    };
}
