/**
 * useChartsData - Hook for fetching data required by charts
 * 
 * Fetches:
 * - Performance trends (with configurable time bucket)
 * - Topic mastery
 * 
 * Note: Heatmap data is managed by the Activity module (useActivityData).
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { AnalyticsService } from "@/api/generated";
import type { PerformanceTrend, TopicMastery } from "@/api/generated";

export type TimeBucket = "day" | "week" | "month";

export interface ChartsData {
    performance: PerformanceTrend[];
    topicMastery: TopicMastery[];
}

export function useChartsData(bucket: TimeBucket = "day") {
    // Performance trends with time bucket
    const performanceQuery = useQuery({
        queryKey: [...queryKeys.analytics.performance(30), bucket],
        queryFn: () => AnalyticsService.getPerformanceApiV1AnalyticsPerformanceGet(30, bucket),
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // Topic Mastery
    const topicMasteryQuery = useQuery({
        queryKey: queryKeys.analytics.topics(),
        queryFn: () => AnalyticsService.getTopicMasteryApiV1AnalyticsTopicsGet(),
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    return {
        data: {
            performance: performanceQuery.data || [],
            topicMastery: topicMasteryQuery.data || [],
        },
        isLoading: performanceQuery.isLoading || topicMasteryQuery.isLoading,
        isFetching: performanceQuery.isFetching,
        error: performanceQuery.error || topicMasteryQuery.error,
        refetch: () => {
            performanceQuery.refetch();
            topicMasteryQuery.refetch();
        },
    };
}

