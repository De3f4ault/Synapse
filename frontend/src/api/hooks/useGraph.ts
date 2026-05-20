// Graph analytics hooks using TanStack Query
import { useQuery } from "@tanstack/react-query";
import { PlatformService } from "../generated";
import { queryKeys } from "@/lib/queryKeys";

// ============================================================================
// Types — aligned to actual backend responses
// ============================================================================

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  density: number;
  avg_connections_per_node: number;
  avg_link_strength: number;
  nodes_by_type: Record<string, number>;
}

export interface GraphHub {
  entity_type: string;
  entity_id: number;
  label: string;
  connections: number;
}

export interface ClusterSummary {
  cluster_count: number;
  largest_cluster_size: number;
  avg_cluster_size: number;
  clusters: Array<{ size: number; members: string[]; truncated?: boolean }>;
}

export interface LinkTypeDistribution {
  link_type: string;
  count: number;
  percentage: number;
  avg_strength: number;
}

export interface GrowthPoint {
  date: string;
  links_created: number;
  entities_touched: number;
}

/** Orphans: Dict keyed by entity_type → list of orphan entities */
export type OrphanMap = Record<string, Array<{ entity_id: number; label: string }>>;

export interface GraphAnalyticsData {
  stats: GraphStats;
  hubs: GraphHub[];
  orphans: OrphanMap;
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
