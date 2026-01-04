/**
 * Shared Context - Entity Resolver
 *
 * INVARIANT: Entity MUST resolve before any other layer.
 * INVARIANT: This is the ONLY way to hydrate an EntityIdentity → LearningEntity.
 *
 * Resolution Contract:
 * 1. Entity MUST resolve before relations or graph
 * 2. Returns null if entity not found (graceful degradation)
 * 3. Capabilities are resolved with availability at this stage
 */

import type { EntityIdentity, LearningEntity, EntityType } from "../core/entity";
import type { ResolvedCapability, EntityCapability } from "../core/capabilities";
import { ENTITY_CAPABILITIES } from "../core/capabilities";

// ============================================================================
// Types
// ============================================================================

/**
 * Module-specific fetch function signature.
 * Each module provides its own implementation.
 */
export type EntityFetcher = (
    id: string | number
) => Promise<EntityFetchResult | null>;

/**
 * Raw entity data from a module's API/store.
 */
export interface EntityFetchResult {
    id: string | number;
    title?: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

/**
 * Availability checker for a specific capability.
 */
export type AvailabilityChecker = (
    entity: EntityFetchResult,
    capability: EntityCapability
) => { available: boolean; reason?: string };

// ============================================================================
// Module Registry
// ============================================================================

/**
 * Registry of entity fetchers by type.
 * Modules register their fetchers here.
 */
const entityFetchers: Partial<Record<EntityType, EntityFetcher>> = {};

/**
 * Registry of availability checkers by type.
 * Optional—defaults to all capabilities available.
 */
const availabilityCheckers: Partial<Record<EntityType, AvailabilityChecker>> = {};

/**
 * Register a fetcher for an entity type.
 * Called by modules during initialization.
 */
export function registerEntityFetcher(
    type: EntityType,
    fetcher: EntityFetcher
): void {
    entityFetchers[type] = fetcher;
}

/**
 * Register an availability checker for an entity type.
 */
export function registerAvailabilityChecker(
    type: EntityType,
    checker: AvailabilityChecker
): void {
    availabilityCheckers[type] = checker;
}

// ============================================================================
// Resolution Logic
// ============================================================================

/**
 * Resolve an EntityIdentity to a full LearningEntity.
 *
 * @param identity - The lightweight entity reference
 * @returns Full LearningEntity or null if not found
 */
export async function resolveEntity(
    identity: EntityIdentity
): Promise<LearningEntity | null> {
    const fetcher = entityFetchers[identity.type];

    if (!fetcher) {
        console.warn(
            `[resolveEntity] No fetcher registered for type: ${identity.type}`
        );
        return null;
    }

    try {
        const raw = await fetcher(identity.id);

        if (!raw) {
            return null;
        }

        // Resolve capabilities with availability
        const capabilities = resolveCapabilities(identity.type, raw);

        return {
            ...identity,
            title: raw.title,
            createdAt: raw.createdAt,
            capabilities,
            visibility: "private", // Default, can be overridden via metadata
            metadata: raw.metadata,
        };
    } catch (error) {
        console.error(`[resolveEntity] Failed to resolve ${identity.type}:${identity.id}`, error);
        return null;
    }
}

/**
 * Resolve capabilities with runtime availability checks.
 */
function resolveCapabilities(
    type: EntityType,
    raw: EntityFetchResult
): ResolvedCapability[] {
    const supportedCapabilities = ENTITY_CAPABILITIES[type] ?? [];
    const checker = availabilityCheckers[type];

    return supportedCapabilities.map((capability) => {
        if (checker) {
            const { available, reason } = checker(raw, capability);
            return { capability, available, reason };
        }

        // Default: available if supported
        return { capability, available: true };
    });
}
