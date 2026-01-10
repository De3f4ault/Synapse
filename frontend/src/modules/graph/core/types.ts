/**
 * Graph Module - Core Types
 *
 * Types for the knowledge graph connecting all learning entities:
 * Notes, Flashcards, Quizzes, Documents, and their relationships.
 */

import { type EntityType as SharedEntityType } from "@/shared/entities";

// ============================================================================
// Identifiers
// ============================================================================

export type GraphNodeId = string; // UUID format for graph operations
export type GraphEdgeId = string;

// ============================================================================
// Node Types
// ============================================================================

/**
 * Entity types that can be nodes in the knowledge graph.
 * Extended from shared EntityType with graph-specific types.
 */
export type EntityType = SharedEntityType | "topic" | "tag" | "concept";

/**
 * A node in the knowledge graph.
 */
export interface GraphNode {
    id: GraphNodeId;
    entityType: EntityType;
    entityId: number; // The ID in the source system (note id, quiz id, etc.)
    label: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// Edge Types
// ============================================================================

/**
 * Relationship types between nodes.
 * Includes legacy types and new GraphEdgeType values.
 */
export type RelationType =
    | "references"      // Note references another note
    | "derived_from"    // Flashcard derived from document
    | "tests_concept"   // Quiz tests a concept
    | "tagged_with"     // Entity tagged with topic
    | "related_to"      // Semantic similarity
    | "prerequisite"    // Learning dependency
    | "contains"        // Hierarchical (deck contains flashcards)
    | "follows"         // Sequential relationship
    // Structural edges (from GraphEdgeType)
    | "wikilink"        // Explicit [[wikilink]] in content
    | "reference"       // Reference to another entity
    | "derived"         // Derived from source
    | "temporal"        // Temporal sequence
    | "semantic"        // Semantic similarity (AI-computed)
    | "tagged"          // Tags/topics relationship
    // Learning intelligence edges (from GraphEdgeType)
    | "practiced"       // User practiced concept
    | "mastery"         // User demonstrates mastery
    | "weakness"        // User has weakness in concept
    // Knowledge source edges (from GraphEdgeType)
    | "sourced_from"    // Document is source for entity
    | "mentions"        // Document mentions entity
    | "extracted";      // Entity extracted from document

/**
 * An edge connecting two nodes in the knowledge graph.
 */
export interface GraphEdge {
    id: GraphEdgeId;
    sourceId: GraphNodeId;
    targetId: GraphNodeId;
    relationType: RelationType;
    weight: number; // Strength of relationship (0-1)
    metadata: Record<string, unknown>;
    createdAt: string;
}

// ============================================================================
// Graph View Types
// ============================================================================

/**
 * Subgraph query result.
 */
export interface SubGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    centerNodeId?: GraphNodeId;
}

/**
 * Graph visualization settings.
 */
export interface GraphViewSettings {
    layout: "force" | "radial" | "hierarchical";
    showLabels: boolean;
    filterTypes: EntityType[];
    maxNodes: number;
    maxDepth: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Node importance metrics.
 */
export interface NodeMetrics {
    nodeId: GraphNodeId;
    degree: number;        // Number of connections
    pageRank: number;      // Importance score
    betweenness: number;   // How central the node is
    clusterCoefficient: number;
}

/**
 * Learning path recommendation.
 */
export interface LearningPath {
    nodes: GraphNode[];
    edges: GraphEdge[];
    estimatedDuration: number; // minutes
    difficulty: "easy" | "medium" | "hard";
}

// ============================================================================
// Error Taxonomy
// ============================================================================

export type GraphErrorCode =
    | "NODE_NOT_FOUND"
    | "EDGE_NOT_FOUND"
    | "INVALID_RELATION"
    | "CYCLE_DETECTED"
    | "GRAPH_TOO_LARGE"
    | "QUERY_TIMEOUT"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";

export interface GraphError {
    code: GraphErrorCode;
    message: string;
    recoverable: boolean;
}

export function createGraphError(
    code: GraphErrorCode,
    message: string,
    recoverable = true
): GraphError {
    return { code, message, recoverable };
}
