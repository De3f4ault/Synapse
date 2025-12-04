import { useQuery } from '@tanstack/react-query';
import {
    getOverviewApiV1AnalyticsOverviewGet,
    getWeakAreasApiV1AnalyticsWeakAreasGet,
    getPerformanceApiV1AnalyticsPerformanceGet,
    getHeatmapApiV1AnalyticsHeatmapGet,
    getTopicMasteryApiV1AnalyticsTopicsGet,
} from '@/api/generated';
import { QUERY_KEYS, ANALYTICS } from '@/lib/constants';
import type {
    DashboardOverview,
    WeakArea,
    PerformanceTrend,
    HeatmapData,
    TopicMastery,
} from '@/api/generated';

/**
 * Hook for fetching dashboard overview metrics.
 */
export function useOverview() {
    return useQuery<DashboardOverview>({
        queryKey: QUERY_KEYS.ANALYTICS.OVERVIEW,
        queryFn: () => getOverviewApiV1AnalyticsOverviewGet(),
                                       staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Hook for fetching weak areas based on review performance.
 */
export function useWeakAreas(limit: number = 10) {
    return useQuery<WeakArea[]>({
        queryKey: [...QUERY_KEYS.ANALYTICS.WEAK_AREAS, limit],
        queryFn: () => getWeakAreasApiV1AnalyticsWeakAreasGet({ limit }),
                                staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook for fetching performance trends over time.
 */
export function usePerformanceTrends(days: number = ANALYTICS.DEFAULT_TREND_DAYS) {
    return useQuery<PerformanceTrend[]>({
        queryKey: QUERY_KEYS.ANALYTICS.PERFORMANCE(days),
                                        queryFn: () => getPerformanceApiV1AnalyticsPerformanceGet({ days }),
                                        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook for fetching activity heatmap data.
 */
export function useHeatmap(days: number = ANALYTICS.DEFAULT_HEATMAP_DAYS) {
    return useQuery<HeatmapData[]>({
        queryKey: QUERY_KEYS.ANALYTICS.HEATMAP(days),
                                   queryFn: () => getHeatmapApiV1AnalyticsHeatmapGet({ days }),
                                   staleTime: 1000 * 60 * 10, // 10 minutes - heatmap changes less frequently
    });
}

/**
 * Hook for fetching topic mastery levels.
 */
export function useTopicMastery() {
    return useQuery<TopicMastery[]>({
        queryKey: QUERY_KEYS.ANALYTICS.TOPICS,
        queryFn: () => getTopicMasteryApiV1AnalyticsTopicsGet(),
                                    staleTime: 1000 * 60 * 5,
    });
}

/**
 * Combined hook for all analytics data.
 * Useful for dashboard pages that need multiple data sources.
 */
export function useAnalyticsDashboard(options?: {
    trendDays?: number;
    heatmapDays?: number;
    weakAreasLimit?: number;
}) {
    const {
        trendDays = ANALYTICS.DEFAULT_TREND_DAYS,
        heatmapDays = ANALYTICS.DEFAULT_HEATMAP_DAYS,
        weakAreasLimit = 10,
    } = options || {};

    const overview = useOverview();
    const weakAreas = useWeakAreas(weakAreasLimit);
    const performance = usePerformanceTrends(trendDays);
    const heatmap = useHeatmap(heatmapDays);
    const mastery = useTopicMastery();

    const isLoading =
    overview.isLoading ||
    weakAreas.isLoading ||
    performance.isLoading ||
    heatmap.isLoading ||
    mastery.isLoading;

    const isError =
    overview.isError ||
    weakAreas.isError ||
    performance.isError ||
    heatmap.isError ||
    mastery.isError;

    return {
        overview,
        weakAreas,
        performance,
        heatmap,
        mastery,
        isLoading,
        isError,
    };
}

export default useAnalyticsDashboard;
