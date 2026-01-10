/**
 * Shared Context - Public API
 *
 * Context resolution layer for the Synapse platform.
 */

// Core resolver
export {
    resolveEntity,
    registerEntityFetcher,
    registerAvailabilityChecker,
    type EntityFetcher,
    type EntityFetchResult,
    type AvailabilityChecker,
} from "./resolveEntity";

// Relations resolver
export {
    resolveRelations,
    registerEdgeFetcher,
    type GraphEdge,
    type EdgeType,
    type EdgeFetcher,
} from "./resolveRelations";

// Graph context resolver
export {
    resolveGraphContext,
    registerGraphContextFetcher,
    getTopRecommendations,
    type GraphContext,
    type PlatformAction,
    type ConceptId,
    type GraphContextFetcher,
} from "./resolveGraphContext";

// React hook
export {
    useLearningContext,
    resolveLearningContext,
    type LearningContext,
    type UseLearningContextResult,
} from "./useLearningContext";
