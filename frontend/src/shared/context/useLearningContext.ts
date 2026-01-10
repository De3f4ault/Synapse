/**
 * Shared Context - Learning Context Hook
 *
 * INVARIANT: Thin orchestrator—composes resolvers, adds nothing.
 * INVARIANT: Follows Resolution Contract strictly.
 *
 * Resolution Contract:
 * 1. Entity MUST resolve before any other layer
 * 2. Relations MAY be empty
 * 3. GraphContext is OPTIONAL
 * 4. Failures MUST degrade gracefully
 */

import { useQuery } from "@tanstack/react-query";
import type { EntityIdentity, LearningEntity } from "../core/entity";
import { entityKey } from "../core/entity";
import { resolveEntity } from "./resolveEntity";
import { resolveRelations } from "./resolveRelations";
import { resolveGraphContext, type GraphContext } from "./resolveGraphContext";

// ============================================================================
// Types
// ============================================================================

/**
 * The complete learning context for an entity.
 */
export interface LearningContext {
    /** The fully resolved entity */
    entity: LearningEntity;
    /** Related entities (as identities—resolve individually if needed) */
    relations: EntityIdentity[];
    /** Optional graph intelligence */
    graph?: GraphContext;
}

/**
 * Hook return type with loading/error states.
 */
export interface UseLearningContextResult {
    context: LearningContext | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Resolve a complete learning context for an entity.
 *
 * Usage:
 * ```tsx
 * const { context, isLoading } = useLearningContext({
 *   id: noteId,
 *   type: "note",
 *   sourceModule: "notes"
 * });
 *
 * if (context) {
 *   // Access entity, relations, and graph intelligence
 *   const available = context.entity.capabilities.filter(c => c.available);
 * }
 * ```
 */
export function useLearningContext(
    identity: EntityIdentity | null
): UseLearningContextResult {
    const queryKey = identity
        ? ["learningContext", entityKey(identity)]
        : ["learningContext", "null"];

    const { data, isLoading, isError, error } = useQuery({
        queryKey,
        queryFn: async (): Promise<LearningContext | null> => {
            if (!identity) return null;

            // Step 1: Resolve entity (MUST succeed)
            const entity = await resolveEntity(identity);
            if (!entity) return null;

            // Step 2: Resolve relations (MAY be empty)
            const relations = await resolveRelations(entity);

            // Step 3: Resolve graph context (OPTIONAL)
            const graph = await resolveGraphContext(entity);

            return { entity, relations, graph };
        },
        enabled: !!identity,
        staleTime: 30_000, // Cache for 30 seconds
    });

    return {
        context: data ?? null,
        isLoading,
        isError,
        error: error as Error | null,
    };
}

// ============================================================================
// Imperative API (for non-React contexts)
// ============================================================================

/**
 * Resolve learning context imperatively (for use outside React).
 */
export async function resolveLearningContext(
    identity: EntityIdentity
): Promise<LearningContext | null> {
    const entity = await resolveEntity(identity);
    if (!entity) return null;

    const relations = await resolveRelations(entity);
    const graph = await resolveGraphContext(entity);

    return { entity, relations, graph };
}
