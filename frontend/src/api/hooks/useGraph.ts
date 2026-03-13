// Graph analytics hooks using TanStack Query
import { useQuery } from "@tanstack/react-query";
import { PlatformService } from "../generated";
import { queryKeys } from "@/lib/queryKeys";

// ============================================================================
// Types
// ============================================================================

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  density: number;
  avg_connections: number;
  nodes_by_type: Record<string, number>;
}

export interface GraphHub {
  entity_type: string;
  entity_id: number;
  entity_label: string;
  outgoing: number;
  incoming: number;
  total: number;
}

export interface ClusterSummary {
  total_clusters: number;
  largest_cluster_size: number;
  avg_cluster_size: number;
  singleton_count: number;
}

export interface LinkTypeDistribution {
  link_type: string;
  count: number;
  percentage: number;
}

export interface GrowthPoint {
  date: string;
  links_created: number;
}

export interface GraphAnalyticsData {
  stats: GraphStats;
  hubs: GraphHub[];
  orphans: Array<{ entity_type: string; count: number }>;
  clusters: ClusterSummary;
  link_type_distribution: LinkTypeDistribution[];
  growth_trend: GrowthPoint[];
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get full graph analytics dashboard
 */
export const useGraphAnalytics = (days: number = 30, hubLimit: number = 10) => {
  return useQuery({
    queryKey: queryKeys.graph.analytics(days),
    queryFn: async () => {
      const data = await PlatformService.getGraphAnalyticsApiV1GraphAnalyticsGet(days, hubLimit);
      return data as unknown as GraphAnalyticsData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to get most connected entities (hubs)
 */
export const useGraphHubs = (limit: number = 20) => {
  return useQuery({
    queryKey: queryKeys.graph.hubs(limit),
    queryFn: async () => {
      const data = await PlatformService.getGraphHubsApiV1GraphAnalyticsHubsGet(limit);
      return data as unknown as GraphHub[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
