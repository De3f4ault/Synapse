/**
 * Shared Core - Canonical Entity Definitions
 *
 * INVARIANT: This is the ONE source of truth for entity types.
 * INVARIANT: All modules use these types for cross-module communication.
 * INVARIANT: Graph and resolvers depend ONLY on these contracts.
 *
 * This file defines the "laws" of what a Learning Entity is in Synapse.
 */

import type { ModuleId } from "./modules";
import type { ResolvedCapability } from "./capabilities";

// ============================================================================
// Entity Types
// ============================================================================

/**
 * All known entity types in the Synapse platform.
 */
export type EntityType =
    | "document"
    | "note"
    | "flashcard"
    | "quiz"
    | "concept";

// ============================================================================
// Entity Identity (Lightweight Reference)
// ============================================================================

/**
 * A minimal, serializable reference to any entity.
 * Use this when you need to pass entity references around without full data.
 */
export interface EntityIdentity {
    /** Unique ID within the entity type */
    readonly id: string | number;
    /** The type of entity */
    readonly type: EntityType;
    /** The module that owns this entity */
    readonly sourceModule: ModuleId;
}

// ============================================================================
// Learning Entity (Full Hydrated Entity)
// ============================================================================

/**
 * Visibility scope for an entity.
 */
export type EntityVisibility = "private" | "workspace" | "global";

/**
 * A fully resolved Learning Entity with capabilities and metadata.
 * This is the "hydrated" form returned by context resolvers.
 */
export interface LearningEntity extends EntityIdentity {
    /** Human-readable title (optional for some types) */
    title?: string;

    /** ISO timestamp of creation */
    createdAt: string;

    /**
     * Resolved capabilities with runtime availability.
     * Use `getAvailableCapabilities()` to filter to usable ones.
     */
    capabilities: ResolvedCapability[];

    /** Access scope */
    visibility: EntityVisibility;

    /** Flexible metadata (module-specific data) */
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an EntityIdentity from raw values.
 */
export function createEntityIdentity(
    type: EntityType,
    id: string | number,
    sourceModule: ModuleId
): EntityIdentity {
    return { id, type, sourceModule };
}

/**
 * Create a stable, unique key for an EntityIdentity.
 * Useful for Maps, Sets, React keys.
 */
export function entityKey(identity: EntityIdentity): string {
    return `${identity.type}:${identity.id}`;
}

/**
 * Check if two EntityIdentity objects point to the same entity.
 */
export function isSameEntity(a: EntityIdentity, b: EntityIdentity): boolean {
    return a.type === b.type && String(a.id) === String(b.id);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if something is an EntityIdentity.
 */
export function isEntityIdentity(value: unknown): value is EntityIdentity {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "type" in value &&
        "sourceModule" in value
    );
}

/**
 * Type guard to check if something is a LearningEntity.
 */
export function isLearningEntity(value: unknown): value is LearningEntity {
    return (
        isEntityIdentity(value) &&
        "capabilities" in value &&
        Array.isArray((value as LearningEntity).capabilities)
    );
}
