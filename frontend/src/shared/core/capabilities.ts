/**
 * Shared Core - Capability Registry
 *
 * INVARIANT: Capabilities define WHAT an entity CAN DO.
 * INVARIANT: Availability is resolved at runtime, not here.
 * INVARIANT: Modules never hardcode capability checks—they use this registry.
 */

import type { EntityType } from "./entity";

// ============================================================================
// Capability Types
// ============================================================================

/**
 * All platform-level capabilities an entity may support.
 */
export type EntityCapability =
    | "REFERENCE_IN_CHAT"
    | "GENERATE_FLASHCARDS"
    | "GENERATE_QUIZ"
    | "REINFORCE_GRAPH"
    | "EXPORT"
    | "SUMMARIZE";

/**
 * A resolved capability with runtime availability.
 * Capability ≠ Availability.
 */
export interface ResolvedCapability {
    /** The capability type */
    capability: EntityCapability;
    /** Whether it's currently available (runtime check) */
    available: boolean;
    /** Optional reason for unavailability (UX + AI explanation) */
    reason?: string;
}

// ============================================================================
// Capability Registry (Static Declaration)
// ============================================================================

/**
 * Declarative mapping of entity types to their SUPPORTED capabilities.
 * This does NOT mean they are available—only that the entity type CAN do this.
 */
export const ENTITY_CAPABILITIES: Record<EntityType, EntityCapability[]> = {
    document: [
        "REFERENCE_IN_CHAT",
        "GENERATE_FLASHCARDS",
        "GENERATE_QUIZ",
        "SUMMARIZE",
        "EXPORT",
    ],
    note: [
        "REFERENCE_IN_CHAT",
        "GENERATE_FLASHCARDS",
        "REINFORCE_GRAPH",
        "SUMMARIZE",
    ],
    flashcard: ["REINFORCE_GRAPH"],
    quiz: ["REINFORCE_GRAPH"],
    concept: ["REINFORCE_GRAPH"],
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if an entity type supports a given capability (static check).
 */
export function supportsCapability(
    entityType: EntityType,
    capability: EntityCapability
): boolean {
    return ENTITY_CAPABILITIES[entityType]?.includes(capability) ?? false;
}

/**
 * Get all capabilities for an entity type.
 */
export function getCapabilitiesForType(entityType: EntityType): EntityCapability[] {
    return ENTITY_CAPABILITIES[entityType] ?? [];
}

/**
 * Filter resolved capabilities to only available ones.
 */
export function getAvailableCapabilities(
    capabilities: ResolvedCapability[]
): ResolvedCapability[] {
    return capabilities.filter((c) => c.available);
}
