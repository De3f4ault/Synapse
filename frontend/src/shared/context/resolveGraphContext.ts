/**
 * Shared Context - Graph Context Resolver
 *
 * INVARIANT: GraphContext is OPTIONAL (graceful degradation).
 * INVARIANT: Graph provides intelligence, not just data.
 *
 * Resolution Contract:
 * - Called AFTER entity is resolved
 * - Returns undefined if graph unavailable (never throws)
 * - Provides weaknesses, strengths, and recommendations
 */

import type { LearningEntity, EntityIdentity } from "../core/entity";
import type { EntityCapability } from "../core/capabilities";

// ============================================================================
// Types
// ============================================================================

/**
 * A concept identifier in the knowledge graph.
 */
export type ConceptId = string;

/**
 * A platform-level recommended action.
 */
export interface PlatformAction {
    /** The capability to exercise */
    type: EntityCapability;
    /** The target entity for the action */
    target: EntityIdentity;
    /** Human-readable reason for the recommendation */
    reason?: string;
    /** Priority score (higher = more important) */
    priority?: number;
}

/**
 * Intelligence context from the knowledge graph.
 */
export interface GraphContext {
    /** Concepts the user is weak on related to this entity */
    weaknesses: ConceptId[];
    /** Concepts the user has mastered related to this entity */
    strengths: ConceptId[];
    /** Recommended actions based on graph analysis */
    recommendedActions: PlatformAction[];
}

/**
 * Function to fetch graph context for an entity.
 */
export type GraphContextFetcher = (
    entity: LearningEntity
) => Promise<GraphContext | null>;

// ============================================================================
// Registry
// ============================================================================

let graphContextFetcher: GraphContextFetcher | null = null;

/**
 * Register the graph context fetcher (provided by Graph module).
 */
export function registerGraphContextFetcher(fetcher: GraphContextFetcher): void {
    graphContextFetcher = fetcher;
}

// ============================================================================
// Resolution Logic
// ============================================================================

/**
 * Resolve graph intelligence context for an entity.
 *
 * @param entity - The resolved LearningEntity
 * @returns GraphContext or undefined if unavailable
 */
export async function resolveGraphContext(
    entity: LearningEntity
): Promise<GraphContext | undefined> {
    if (!graphContextFetcher) {
        // Graph not initialized yet—graceful degradation
        return undefined;
    }

    try {
        const context = await graphContextFetcher(entity);
        return context ?? undefined;
    } catch (error) {
        console.error(
            `[resolveGraphContext] Failed for ${entity.type}:${entity.id}`,
            error
        );
        return undefined;
    }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get top N recommended actions sorted by priority.
 */
export function getTopRecommendations(
    context: GraphContext,
    limit = 3
): PlatformAction[] {
    return [...context.recommendedActions]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        .slice(0, limit);
}
