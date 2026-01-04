/**
 * Shared Context - Relations Resolver
 *
 * INVARIANT: Relations MAY be empty (graceful degradation).
 * INVARIANT: Depends on resolveEntity—never fetches raw data directly.
 *
 * Resolution Contract:
 * - Called AFTER entity is resolved
 * - Returns empty array on failure (never throws)
 * - Uses Graph edges to find related entities
 */

import type { LearningEntity, EntityIdentity } from "../core/entity";

// ============================================================================
// Types
// ============================================================================

/**
 * Graph edge representing a relationship between entities.
 */
export interface GraphEdge {
    source: EntityIdentity;
    target: EntityIdentity;
    type: EdgeType;
    weight?: number;
}

export type EdgeType =
    | "REFERENCES"
    | "GENERATED_FROM"
    | "RELATED_TO"
    | "WEAKNESS"
    | "STRENGTH";

/**
 * Function to fetch graph edges for an entity.
 */
export type EdgeFetcher = (identity: EntityIdentity) => Promise<GraphEdge[]>;

// ============================================================================
// Registry
// ============================================================================

let edgeFetcher: EdgeFetcher | null = null;

/**
 * Register the edge fetcher (provided by Graph module).
 */
export function registerEdgeFetcher(fetcher: EdgeFetcher): void {
    edgeFetcher = fetcher;
}

// ============================================================================
// Resolution Logic
// ============================================================================

/**
 * Resolve related entities for a given entity.
 *
 * @param entity - The resolved LearningEntity
 * @returns Array of related EntityIdentity objects (not fully resolved)
 */
export async function resolveRelations(
    entity: LearningEntity
): Promise<EntityIdentity[]> {
    if (!edgeFetcher) {
        console.warn("[resolveRelations] No edge fetcher registered");
        return [];
    }

    try {
        const edges = await edgeFetcher(entity);

        // Extract unique related entities
        const related = new Map<string, EntityIdentity>();

        for (const edge of edges) {
            // Get the "other" entity in the relationship
            const other =
                edge.source.id === entity.id && edge.source.type === entity.type
                    ? edge.target
                    : edge.source;

            const key = `${other.type}:${other.id}`;
            if (!related.has(key)) {
                related.set(key, other);
            }
        }

        return Array.from(related.values());
    } catch (error) {
        console.error(
            `[resolveRelations] Failed for ${entity.type}:${entity.id}`,
            error
        );
        return [];
    }
}
