/**
 * Shared Platform - Public API
 *
 * Platform-level enforcement and orchestration.
 */

// Types
export {
    type ActionStatus,
    type GraphEffect,
    type PlatformActionResult,
    type ModuleContract,
    type ModuleEntityResolver,
    type ModuleCapabilityExecutor,
    type ModuleEntitySearcher,
    successResult,
    errorResult,
} from "./types";

// Registry
export {
    registerModule,
    unregisterModule,
    getModule,
    getModuleForEntityType,
    getAllModules,
    isModuleRegistered,
    getRegisteredModuleIds,
    clearRegistry,
    getRegistryStats,
} from "./registry";

// Executor
export {
    executeCapability,
    executeCapabilityBatch,
    canExecuteCapability,
} from "./executor";

// Initialization
export { initPlatform, isPlatformInitialized } from "./init";
