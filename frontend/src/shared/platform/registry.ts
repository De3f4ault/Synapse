/**
 * Shared Platform - Module Registry
 *
 * INVARIANT: Single source of truth for registered modules.
 * INVARIANT: Modules register themselves at initialization.
 * INVARIANT: Platform queries registry, never imports modules directly.
 */

import type { ModuleId } from "@/shared/core/modules";
import type { EntityType } from "@/shared/core/entity";
import type { ModuleContract } from "./types";

// ============================================================================
// Registry State
// ============================================================================

/**
 * Map of registered modules by their ID.
 */
const modules = new Map<ModuleId, ModuleContract>();

/**
 * Map of entity types to their owning modules.
 */
const entityTypeOwners = new Map<EntityType, ModuleId>();

// ============================================================================
// Registration API
// ============================================================================

/**
 * Register a module with the platform.
 * Should be called during app initialization.
 *
 * @param contract - The module's implementation of the platform contract
 * @throws Error if module is already registered
 */
export function registerModule(contract: ModuleContract): void {
    if (modules.has(contract.id)) {
        console.warn(
            `[ModuleRegistry] Module "${contract.id}" already registered, updating...`
        );
    }

    modules.set(contract.id, contract);

    // Register entity type ownership
    for (const entityType of contract.entityTypes) {
        entityTypeOwners.set(entityType as EntityType, contract.id);
    }

    if (process.env.NODE_ENV === "development") {
        console.debug(
            `[ModuleRegistry] Registered module: ${contract.id}`,
            { entityTypes: contract.entityTypes }
        );
    }
}

/**
 * Unregister a module (primarily for testing).
 */
export function unregisterModule(moduleId: ModuleId): void {
    const contract = modules.get(moduleId);
    if (contract) {
        // Remove entity type ownership
        for (const entityType of contract.entityTypes) {
            entityTypeOwners.delete(entityType as EntityType);
        }
        modules.delete(moduleId);
    }
}

// ============================================================================
// Query API
// ============================================================================

/**
 * Get a registered module by ID.
 */
export function getModule(moduleId: ModuleId): ModuleContract | undefined {
    return modules.get(moduleId);
}

/**
 * Get the module that owns a specific entity type.
 */
export function getModuleForEntityType(
    entityType: EntityType
): ModuleContract | undefined {
    const moduleId = entityTypeOwners.get(entityType);
    return moduleId ? modules.get(moduleId) : undefined;
}

/**
 * Get all registered modules.
 */
export function getAllModules(): ModuleContract[] {
    return Array.from(modules.values());
}

/**
 * Check if a module is registered.
 */
export function isModuleRegistered(moduleId: ModuleId): boolean {
    return modules.has(moduleId);
}

/**
 * Get a list of all registered module IDs.
 */
export function getRegisteredModuleIds(): ModuleId[] {
    return Array.from(modules.keys());
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Clear all registrations (for testing).
 */
export function clearRegistry(): void {
    modules.clear();
    entityTypeOwners.clear();
}

/**
 * Get registry stats (for debugging).
 */
export function getRegistryStats(): {
    moduleCount: number;
    entityTypesOwned: number;
} {
    return {
        moduleCount: modules.size,
        entityTypesOwned: entityTypeOwners.size,
    };
}
