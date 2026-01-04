/**
 * useMetrics - Hook for consuming dashboard metrics
 * 
 * This hook provides read-only access to metrics data computed from
 * various domain modules. It does NOT own or cache the data - it
 * composes data from other sources.
 * 
 * The dashboard is an Integration Layer: reads truth, computes meaning.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { AnalyticsService } from "@/api/generated";

export interface DashboardMetrics {
    dueCards: number;
    accuracy: number;
    streakDays: number;
    totalStudyTimeMinutes: number;
    cardsReviewedToday: number;
    totalCards: number;
}

export function useMetrics() {
    const overviewQuery = useQuery({
        queryKey: queryKeys.analytics.overview(),
        queryFn: () => AnalyticsService.getOverviewApiV1AnalyticsOverviewGet(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const metrics = useMemo<DashboardMetrics | undefined>(() => {
        if (!overviewQuery.data) return undefined;

        const data = overviewQuery.data;
        return {
            dueCards: data.due_cards ?? 0,
            accuracy: data.overall_accuracy ?? 0,
            streakDays: data.study_streak_days ?? 0,
            totalStudyTimeMinutes: data.total_study_time_minutes ?? 0,
            cardsReviewedToday: data.cards_reviewed_today ?? 0,
            totalCards: data.total_cards ?? 0,
        };
    }, [overviewQuery.data]);

    return {
        metrics,
        isLoading: overviewQuery.isLoading,
        error: overviewQuery.error,
        refetch: overviewQuery.refetch,
    };
}
