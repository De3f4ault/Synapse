/**
 * Shared Platform - Capability Executor
 *
 * INVARIANT: All capability execution flows through here.
 * INVARIANT: Validates availability before execution.
 * INVARIANT: Emits events for graph and analytics.
 */

import type { LearningEntity } from "@/shared/core/entity";
import type { EntityCapability } from "@/shared/core/capabilities";
import { getModuleForEntityType } from "./registry";
import { errorResult, type PlatformActionResult } from "./types";
import { emitEvent, createEvent } from "@/shared/events";

// ============================================================================
// Capability Execution
// ============================================================================

/**
 * Execute a capability on an entity.
 *
 * This is the single entry point for all capability-based actions.
 * It validates, routes, executes, and emits events.
 *
 * @param capability - The capability to execute
 * @param entity - The target entity
 * @param options - Optional execution parameters
 * @returns PlatformActionResult
 */
export async function executeCapability(
    capability: EntityCapability,
    entity: LearningEntity,
    options?: Record<string, unknown>
): Promise<PlatformActionResult> {
    // Step 1: Validate capability availability
    const resolvedCapability = entity.capabilities.find(
        (c) => c.capability === capability
    );

    if (!resolvedCapability) {
        return errorResult(
            "CAPABILITY_NOT_SUPPORTED",
            `Entity type "${entity.type}" does not support capability "${capability}"`,
            false
        );
    }

    if (!resolvedCapability.available) {
        return errorResult(
            "CAPABILITY_UNAVAILABLE",
            resolvedCapability.reason ||
            `Capability "${capability}" is not currently available`,
            true
        );
    }

    // Step 2: Get the owning module
    const module = getModuleForEntityType(entity.type);

    if (!module) {
        return errorResult(
            "MODULE_NOT_FOUND",
            `No module registered for entity type "${entity.type}"`,
            false
        );
    }

    // Step 3: Emit "capability started" event
    emitEvent(
        createEvent("platform.capability.started", {
            capability,
            entityType: entity.type,
            entityId: entity.id,
            moduleId: module.id,
        })
    );

    // Step 4: Execute via module
    let result: PlatformActionResult;

    try {
        result = await module.executeCapability(capability, entity, options);
    } catch (error) {
        result = errorResult(
            "EXECUTION_FAILED",
            error instanceof Error ? error.message : "Unknown execution error",
            true
        );
    }

    // Step 5: Emit "capability completed" event
    emitEvent(
        createEvent("platform.capability.completed", {
            capability,
            entityType: entity.type,
            entityId: entity.id,
            moduleId: module.id,
            status: result.status,
            createdEntities: result.createdEntities,
            graphEffects: result.graphEffects,
        })
    );

    return result;
}

// ============================================================================
// Batch Execution
// ============================================================================

/**
 * Execute a capability on multiple entities.
 */
export async function executeCapabilityBatch(
    capability: EntityCapability,
    entities: LearningEntity[],
    options?: Record<string, unknown>
): Promise<Map<string, PlatformActionResult>> {
    const results = new Map<string, PlatformActionResult>();

    await Promise.all(
        entities.map(async (entity) => {
            const key = `${entity.type}:${entity.id}`;
            const result = await executeCapability(capability, entity, options);
            results.set(key, result);
        })
    );

    return results;
}

// ============================================================================
// Capability Checks
// ============================================================================

/**
 * Check if a capability can be executed (without executing it).
 */
export function canExecuteCapability(
    capability: EntityCapability,
    entity: LearningEntity
): { canExecute: boolean; reason?: string } {
    const resolvedCapability = entity.capabilities.find(
        (c) => c.capability === capability
    );

    if (!resolvedCapability) {
        return {
            canExecute: false,
            reason: `Entity does not support "${capability}"`,
        };
    }

    if (!resolvedCapability.available) {
        return {
            canExecute: false,
            reason: resolvedCapability.reason || "Capability not available",
        };
    }

    const module = getModuleForEntityType(entity.type);
    if (!module) {
        return {
            canExecute: false,
            reason: "Module not registered",
        };
    }

    return { canExecute: true };
}
