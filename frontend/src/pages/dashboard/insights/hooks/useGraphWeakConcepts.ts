/**
 * useGraphWeakConcepts - Query graph WEAKNESS edges for dashboard
 *
 * Bridges the graph learning module with dashboard insights.
 * Converts graph WEAKNESS edges to WeakArea-compatible format.
 *
 * NO GRAPH TYPES LEAK TO DASHBOARD - pure transformation.
 */

import { useMemo } from "react";
import { useWeakConcepts } from "@/modules/graph/hooks";

// ============================================================================
// Types
// ============================================================================

/**
 * Graph-sourced weak area for merging with API weak areas.
 * Compatible with mergeWeakAreas function signature.
 */
export interface GraphWeakArea {
    /** Topic/concept name */
    topic: string;

    /** Accuracy proxy (inverted weight) */
    accuracy: number;

    /** Review count (0 for graph-only) */
    review_count: number;

    /** Always 'graph' for items from this hook */
    source: "graph";

    /** Graph edge strength (0-1) - lower = weaker */
    graphStrength: number;

    /** When the weakness was detected (last updated) */
    detectedAt: string;

    /** Last reinforcement timestamp */
    lastReinforcedAt?: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useGraphWeakConcepts(): {
    weakAreas: GraphWeakArea[];
    isLoading: boolean;
} {
    const { weakConcepts, hasWeaknesses } = useWeakConcepts();

    const weakAreas = useMemo<GraphWeakArea[]>(() => {
        if (!hasWeaknesses || weakConcepts.length === 0) {
            return [];
        }

        return weakConcepts
            .map((conceptStrength) => {
                const { concept, weight, lastUpdatedAt } = conceptStrength;

                // Weight in WEAKNESS edges is higher = more severe weakness
                // Convert to strength (lower = weaker) for consistency with decay model
                const graphStrength = 1 - Math.min(1, weight);

                // Convert graph concept to GraphWeakArea format
                const weakArea: GraphWeakArea = {
                    topic: concept.label || concept.id || "Unknown",
                    accuracy: graphStrength, // Use inverted weight as accuracy proxy
                    review_count: 0, // Not tracked in WEAKNESS edge
                    source: "graph",
                    graphStrength,
                    detectedAt: lastUpdatedAt || new Date().toISOString(),
                    lastReinforcedAt: lastUpdatedAt || undefined,
                };

                return weakArea;
            })
            // Only include items that are actually weak (below threshold)
            .filter((area) => area.graphStrength < 0.7)
            // Sort by weakness severity (lowest strength first)
            .sort((a, b) => a.graphStrength - b.graphStrength);
    }, [weakConcepts, hasWeaknesses]);

    return {
        weakAreas,
        isLoading: false, // Graph data is synchronous
    };
}
