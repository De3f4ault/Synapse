/**
 * Graph Module - Core Public API
 *
 * Knowledge graph for connecting all learning entities.
 */

// Types
export type {
    GraphNodeId,
    GraphEdgeId,
    EntityType,
    GraphNode,
    RelationType,
    GraphEdge,
    SubGraph,
    GraphViewSettings,
    NodeMetrics,
    LearningPath,
    GraphErrorCode,
    GraphError,
} from "./types";
export { createGraphError } from "./types";

// Event Consumer
export {
    initGraphEventConsumer,
    onGraphEvent,
    isGraphEventConsumerInitialized,
    type GraphEventContext,
    type GraphEventType,
} from "./eventConsumer";

// Graph Store
export {
    useGraphStore,
    GraphEdgeType,
    nodeIdFromEntity,
    type NeighborQueryOptions,
} from "./graphStore";

// Graph Handlers
export { initGraphHandlers } from "./graphHandlers";

// Link Extraction
export {
    extractWikiLinks,
    extractNoteLinks,
    extractAllLinks,
    resolveLinks,
    stubResolver,
    type RawLinkReference,
    type ResolvedLink,
    type LinkResolver,
} from "./linkExtractor";

// Learning Handlers
export { initLearningHandlers, applyWeaknessDecay } from "./learningHandlers";

// Document Handlers
export {
    initDocumentHandlers,
    linkNoteToDocument,
    markNoteExtractedFromDocument,
} from "./documentHandlers";

// Learning Constants
export {
    MASTERY_ACCURACY_THRESHOLD,
    MASTERY_MIN_ATTEMPTS,
    MASTERY_RECENCY_DAYS,
    WEAKNESS_ACCURACY_THRESHOLD,
    WEAKNESS_INITIAL_WEIGHT,
    WEAKNESS_DAILY_DECAY_RATE,
    CURRENT_USER_NODE_ID,
} from "./learningConstants";

// Decay Engine
export {
    calculateDecay,
    applyDecay,
    reinforceSuccess,
    reinforceFailure,
    calculateOptimalInterval,
    generateForgettingCurve,
    createLearningMetadata,
    extractLearningMetadata,
    isLearningEdge,
    DECAY_CONSTANTS,
    type LearningEdgeMetadata,
    type DecayResult,
} from "./decayEngine";

// Intelligence Contracts
export {
    computeGraphIntelligence,
    initGraphIntelligenceProvider,
    type GraphContext,
    type PlatformAction,
    type ConceptId,
} from "./intelligence";
