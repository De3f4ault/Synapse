// Analytics hooks using TanStack Query
import { useQuery } from "@tanstack/react-query";
import { AnalyticsService } from "../generated";
import type {
  DashboardOverview,
  WeakArea,
  PerformanceTrend,
  HeatmapData,
  TopicMastery,
} from "../generated";

const ANALYTICS_KEYS = {
  all: ["analytics"] as const,
  overview: () => [...ANALYTICS_KEYS.all, "overview"] as const,
  weakAreas: () => [...ANALYTICS_KEYS.all, "weakAreas"] as const,
  performance: (days: number) =>
    [...ANALYTICS_KEYS.all, "performance", days] as const,
  heatmap: (days: number) => [...ANALYTICS_KEYS.all, "heatmap", days] as const,
  topics: () => [...ANALYTICS_KEYS.all, "topics"] as const,
};

/**
 * Hook to get dashboard overview statistics
 */
export const useAnalyticsOverview = () => {
  return useQuery<DashboardOverview>({
    queryKey: ANALYTICS_KEYS.overview(),
    queryFn: () => AnalyticsService.getOverviewApiV1AnalyticsOverviewGet(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to get weak areas that need practice
 */
export const useWeakAreas = (limit?: number) => {
  return useQuery<WeakArea[]>({
    queryKey: ANALYTICS_KEYS.weakAreas(),
    queryFn: () =>
      AnalyticsService.getWeakAreasApiV1AnalyticsWeakAreasGet(limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to get performance trends over time
 */
export const usePerformanceTrends = (days: number = 30) => {
  return useQuery<PerformanceTrend[]>({
    queryKey: ANALYTICS_KEYS.performance(days),
    queryFn: () =>
      AnalyticsService.getPerformanceApiV1AnalyticsPerformanceGet(days),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to get activity heatmap data
 */
export const useActivityHeatmap = (days: number = 365) => {
  return useQuery<HeatmapData[]>({
    queryKey: ANALYTICS_KEYS.heatmap(days),
    queryFn: () => AnalyticsService.getHeatmapApiV1AnalyticsHeatmapGet(days),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook to get mastery levels per topic/deck
 */
export const useTopicMastery = () => {
  return useQuery<TopicMastery[]>({
    queryKey: ANALYTICS_KEYS.topics(),
    queryFn: () => AnalyticsService.getTopicMasteryApiV1AnalyticsTopicsGet(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
