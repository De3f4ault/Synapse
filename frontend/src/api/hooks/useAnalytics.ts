// Analytics hooks using TanStack Query
import { useQuery } from '@tanstack/react-query';
import {
    getOverviewApiV1AnalyticsOverviewGet,
    getWeakAreasApiV1AnalyticsWeakAreasGet,
    getPerformanceApiV1AnalyticsPerformanceGet,
    getHeatmapApiV1AnalyticsHeatmapGet,
    getTopicMasteryApiV1AnalyticsTopicsGet,
} from '../generated/services.gen';
import type {
    DashboardOverview,
    WeakArea,
    PerformanceTrend,
    HeatmapData,
    TopicMastery,
} from '../generated/types.gen';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to get dashboard overview statistics
 */
export const useAnalyticsOverview = () => {
    return useQuery<DashboardOverview>({
        queryKey: queryKeys.analytics.overview(),
                                       queryFn: getOverviewApiV1AnalyticsOverviewGet,
                                       staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to get weak areas that need practice
 */
export const useWeakAreas = (limit?: number) => {
    return useQuery<WeakArea[]>({
        queryKey: queryKeys.analytics.weakAreas(),
                                queryFn: () => getWeakAreasApiV1AnalyticsWeakAreasGet({ limit }),
                                staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

/**
 * Hook to get performance trends over time
 */
export const usePerformanceTrends = (days: number = 30) => {
    return useQuery<PerformanceTrend[]>({
        queryKey: queryKeys.analytics.performance(days),
                                        queryFn: () => getPerformanceApiV1AnalyticsPerformanceGet({ days }),
                                        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

/**
 * Hook to get activity heatmap data
 */
export const useActivityHeatmap = (days: number = 365) => {
    return useQuery<HeatmapData[]>({
        queryKey: queryKeys.analytics.heatmap(days),
                                   queryFn: () => getHeatmapApiV1AnalyticsHeatmapGet({ days }),
                                   staleTime: 1000 * 60 * 30, // 30 minutes
    });
};

/**
 * Hook to get mastery levels per topic/deck
 */
export const useTopicMastery = () => {
    return useQuery<TopicMastery[]>({
        queryKey: queryKeys.analytics.topics(),
                                    queryFn: getTopicMasteryApiV1AnalyticsTopicsGet,
                                    staleTime: 1000 * 60 * 10, // 10 minutes
    });
};
