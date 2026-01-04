/**
 * Shared Core - Public API
 *
 * The canonical definitions for the Synapse platform.
 * All cross-module communication uses these types.
 */

// Modules
export { type ModuleId, MODULE_LABELS } from "./modules";

// Entity types and contracts
export {
    type EntityType,
    type EntityIdentity,
    type EntityVisibility,
    type LearningEntity,
    createEntityIdentity,
    entityKey,
    isSameEntity,
    isEntityIdentity,
    isLearningEntity,
} from "./entity";

// Capabilities
export {
    type EntityCapability,
    type ResolvedCapability,
    ENTITY_CAPABILITIES,
    supportsCapability,
    getCapabilitiesForType,
    getAvailableCapabilities,
} from "./capabilities";
