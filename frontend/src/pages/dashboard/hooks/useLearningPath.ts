/**
 * useLearningPath - Generate learning pathways from deck/topic data
 * Hooks into dashboard data to create structured learning paths
 */

import { useMemo } from "react";
import { generatePathways } from "../utils/pathwayGenerator";
import type { DashboardData } from "../types/dashboard.types";
import type { LearningPathway } from "../types/pathway.types";

interface UseLearningPathReturn {
  pathways: LearningPathway[];
  isLoading: boolean;
  totalPathways: number;
  completedPathways: number;
  inProgressPathways: number;
  averageCompletion: number;
}

/**
 * Hook to generate and manage learning pathways
 *
 * @param data - Dashboard data containing decks and cards
 * @returns Learning pathways with statistics
 */
export function useLearningPath(
  data: DashboardData | undefined,
): UseLearningPathReturn {
  const pathways = useMemo(() => {
    if (!data) return [];

    try {
      return generatePathways(data);
    } catch (error) {
      console.error("Error generating pathways:", error);
      return [];
    }
  }, [data]);

  const stats = useMemo(() => {
    const totalPathways = pathways.length;
    const completedPathways = pathways.filter(
      (p) => p.completionPercentage === 100,
    ).length;
    const inProgressPathways = pathways.filter(
      (p) => p.completionPercentage > 0 && p.completionPercentage < 100,
    ).length;

    const averageCompletion =
      totalPathways > 0
        ? Math.round(
            pathways.reduce((sum, p) => sum + p.completionPercentage, 0) /
              totalPathways,
          )
        : 0;

    return {
      totalPathways,
      completedPathways,
      inProgressPathways,
      averageCompletion,
    };
  }, [pathways]);

  return {
    pathways,
    isLoading: !data,
    ...stats,
  };
}

/**
 * Get pathway by ID
 */
export function usePathwayById(
  pathways: LearningPathway[],
  pathwayId: string,
): LearningPathway | undefined {
  return useMemo(() => {
    return pathways.find((p) => p.id === pathwayId);
  }, [pathways, pathwayId]);
}

/**
 * Get next recommended pathway to work on
 */
export function useNextRecommendedPathway(
  pathways: LearningPathway[],
): LearningPathway | null {
  return useMemo(() => {
    // Filter incomplete pathways
    const incomplete = pathways.filter((p) => p.completionPercentage < 100);

    if (incomplete.length === 0) return null;

    // Sort by completion (lowest first) and return highest priority
    return incomplete.sort((a, b) => {
      // Prioritize started pathways over new ones
      if (a.completionPercentage > 0 && b.completionPercentage === 0) return -1;
      if (b.completionPercentage > 0 && a.completionPercentage === 0) return 1;

      // Then by lowest completion
      return a.completionPercentage - b.completionPercentage;
    })[0];
  }, [pathways]);
}
