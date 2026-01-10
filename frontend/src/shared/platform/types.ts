/**
 * Shared Platform - Types
 *
 * INVARIANT: These are the contracts for platform-level operations.
 * INVARIANT: Modules implement these contracts, platform enforces them.
 */

import type { EntityIdentity, LearningEntity } from "@/shared/core/entity";
import type { EntityCapability } from "@/shared/core/capabilities";
import type { ModuleId } from "@/shared/core/modules";

// ============================================================================
// Action Results
// ============================================================================

/**
 * Status of a platform action.
 */
export type ActionStatus = "success" | "error" | "cancelled" | "pending";

/**
 * Effect on the knowledge graph from an action.
 */
export interface GraphEffect {
    type: "node_created" | "edge_created" | "edge_reinforced" | "edge_weakened";
    nodeId?: string;
    edgeId?: string;
    description?: string;
}

// ============================================================================
// Entity Identity (Lightweight Reference)
// ============================================================================

/**
 * Result from the global entity search API.
 */
export interface EntitySearchResult extends EntityIdentity {
    title: string;
    createdAt?: string;
    matchPreview?: string;
}

/**
 * Standard result from any platform-level action.
 */

export interface PlatformActionResult {
    /** Action status */
    status: ActionStatus;
    /** Human-readable message */
    message?: string;
    /** Entities created by this action */
    createdEntities?: EntityIdentity[];
    /** Effects on the knowledge graph */
    graphEffects?: GraphEffect[];
    /** Error details if status is "error" */
    error?: {
        code: string;
        message: string;
        recoverable: boolean;
    };
}

// ============================================================================
// Module Contract
// ============================================================================

/**
 * Entity resolver function provided by each module.
 */
export type ModuleEntityResolver = (
    id: string | number
) => Promise<LearningEntity | null>;

/**
 * Capability executor function provided by each module.
 */
export type ModuleCapabilityExecutor = (
    capability: EntityCapability,
    entity: LearningEntity,
    options?: Record<string, unknown>
) => Promise<PlatformActionResult>;

/**
 * Entity search function provided by each module.
 */
export type ModuleEntitySearcher = (
    query: string,
    limit?: number
) => Promise<LearningEntity[]>;

/**
 * Contract that each module must fulfill to register with the platform.
 */
export interface ModuleContract {
    /** Module identifier */
    id: ModuleId;

    /** Human-readable name */
    name: string;

    /** Entity types this module owns */
    entityTypes: string[];

    /** Resolve an entity by ID */
    resolveEntity: ModuleEntityResolver;

    /** Execute a capability on an entity */
    executeCapability: ModuleCapabilityExecutor;

    /** Search for entities (optional) */
    searchEntities?: ModuleEntitySearcher;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a successful action result.
 */
export function successResult(
    message?: string,
    extras?: Partial<PlatformActionResult>
): PlatformActionResult {
    return {
        status: "success",
        message,
        ...extras,
    };
}

/**
 * Create an error action result.
 */
export function errorResult(
    code: string,
    message: string,
    recoverable = true
): PlatformActionResult {
    return {
        status: "error",
        message,
        error: { code, message, recoverable },
    };
}
