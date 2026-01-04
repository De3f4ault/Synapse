/**
 * Graph Module - State Store
 *
 * ARCHITECTURE:
 * - Graph owns its own state (Zustand)
 * - Node IDs are DETERMINISTIC from EntityRef (via entityKey)
 * - Edge types are EXPLICIT via GraphEdgeType enum
 * - All mutations are idempotent
 *
 * The store is populated by event handlers, not direct API calls.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { entityKey, type EntityRef, type EntityType as SharedEntityType } from "@/shared/entities";
import type { GraphNode, GraphEdge, SubGraph, EntityType, RelationType } from "./types";

// Enable Immer's Map/Set support (required for Map-based state)
enableMapSet();

// ============================================================================
// Edge Type Enum (Critical for filtering & analytics)
// ============================================================================

/**
 * Explicit edge relationship types.
 * Every edge MUST have a type.
 */
export enum GraphEdgeType {
    // ======== Structural Edges (Notes ↔ Graph) ========

    /** Explicit [[wikilink]] in content */
    WIKILINK = "wikilink",

    /** Reference to another entity (citation, mention) */
    REFERENCE = "reference",

    /** Derived from source (e.g., flashcard from document) */
    DERIVED = "derived",

    /** Temporal sequence (follows, precedes) */
    TEMPORAL = "temporal",

    /** Semantic similarity (AI-computed) */
    SEMANTIC = "semantic",

    /** Tags/topics relationship */
    TAGGED = "tagged",

    /** Hierarchical containment (deck contains cards) */
    CONTAINS = "contains",

    /** Learning prerequisite */
    PREREQUISITE = "prerequisite",

    // ======== Learning Intelligence Edges (Quizzes ↔ Graph) ========

    /**
     * User has practiced this concept.
     * Created when: quiz.completed, card.reviewed
     * Weight: based on score/accuracy
     * Direction: Quiz/Card → Concept
     */
    PRACTICED = "practiced",

    /**
     * User demonstrates mastery of concept.
     * Created when: accuracy ≥ threshold over N attempts
     * Direction: User → Concept
     */
    MASTERY = "mastery",

    /**
     * User has identified weakness in concept.
     * Created when: low accuracy or wrong answers
     * Decays over time as user improves
     * Direction: User → Concept
     */
    WEAKNESS = "weakness",

    // ======== Knowledge Source Edges (Documents ↔ Graph) ========

    /**
     * Document is the source for another entity.
     * Created when: note/flashcard explicitly derived from document
     * Direction: Document → Note/Concept
     */
    SOURCED_FROM = "sourced_from",

    /**
     * Document mentions/cites a note or concept.
     * Created when: [[wikilink]] found in document text
     * Direction: Document → Note
     */
    MENTIONS = "mentions",

    /**
     * Note or concept is extracted from document.
     * Created when: user explicitly extracts content from document
     * Direction: Document → Note/Concept
     */
    EXTRACTED = "extracted",
}

// ============================================================================
// Store State Types
// ============================================================================

interface GraphState {
    // Data
    nodes: Map<string, GraphNode>;
    edges: Map<string, GraphEdge>;

    // Node Actions
    addNode: (entity: EntityRef, label: string, metadata?: Record<string, unknown>) => GraphNode;
    updateNode: (nodeId: string, updates: Partial<Pick<GraphNode, "label" | "metadata">>) => void;
    removeNode: (nodeId: string) => void;
    touchNode: (nodeId: string) => void; // Update lastAccessedAt

    // Edge Actions
    addEdge: (
        sourceId: string,
        targetId: string,
        edgeType: GraphEdgeType,
        weight?: number,
        metadata?: Record<string, unknown>
    ) => GraphEdge | null;
    removeEdge: (edgeId: string) => void;
    removeEdgesForNode: (nodeId: string) => void;

    // Queries
    getNode: (nodeId: string) => GraphNode | undefined;
    getNodeByEntity: (type: SharedEntityType, entityId: number | string) => GraphNode | undefined;
    getEdgesForNode: (nodeId: string, direction?: "in" | "out" | "both") => GraphEdge[];
    getNeighbors: (nodeId: string, options?: NeighborQueryOptions) => SubGraph;

    // Utilities
    clear: () => void;
    getNodeCount: () => number;
    getEdgeCount: () => number;
}

export interface NeighborQueryOptions {
    /** How many hops to traverse (default: 1) */
    depth?: number;
    /** Direction to traverse (default: "both") */
    direction?: "in" | "out" | "both";
    /** Filter by edge types (default: all) */
    edgeTypes?: GraphEdgeType[];
    /** Maximum nodes to return (default: 50) */
    maxNodes?: number;
}

// ============================================================================
// ID Generation
// ============================================================================

let edgeCounter = 0;

/**
 * Generate deterministic node ID from EntityRef.
 * This ensures idempotent node creation.
 */
export function nodeIdFromEntity(entity: EntityRef): string {
    return entityKey(entity);
}

/**
 * Generate unique edge ID.
 * Edge IDs are NOT deterministic because the same source/target
 * can have multiple edge types.
 */
function generateEdgeId(sourceId: string, targetId: string, edgeType: GraphEdgeType): string {
    return `${sourceId}->${targetId}:${edgeType}:${++edgeCounter}`;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useGraphStore = create<GraphState>()(
    devtools(
        persist(
            immer((set, get) => ({
                nodes: new Map(),
                edges: new Map(),

                // ======== Node Actions ========

                addNode: (entity, label, metadata = {}) => {
                    const nodeId = nodeIdFromEntity(entity);
                    const now = new Date().toISOString();

                    // Check if node already exists (idempotent)
                    const existing = get().nodes.get(nodeId);
                    if (existing) {
                        // Update existing node instead of creating duplicate
                        set((state) => {
                            const node = state.nodes.get(nodeId);
                            if (node) {
                                node.label = label;
                                node.metadata = { ...node.metadata, ...metadata };
                                node.updatedAt = now;
                            }
                        });
                        return get().nodes.get(nodeId)!;
                    }

                    // Create new node
                    const node: GraphNode = {
                        id: nodeId,
                        entityType: entity.type as EntityType,
                        entityId: typeof entity.id === "string" ? parseInt(entity.id, 10) : entity.id,
                        label,
                        metadata: {
                            ...metadata,
                            lastAccessedAt: now,
                        },
                        createdAt: now,
                        updatedAt: now,
                    };

                    set((state) => {
                        state.nodes.set(nodeId, node);
                    });

                    return node;
                },

                updateNode: (nodeId, updates) => {
                    set((state) => {
                        const node = state.nodes.get(nodeId);
                        if (node) {
                            if (updates.label !== undefined) node.label = updates.label;
                            if (updates.metadata !== undefined) {
                                node.metadata = { ...node.metadata, ...updates.metadata };
                            }
                            node.updatedAt = new Date().toISOString();
                        }
                    });
                },

                removeNode: (nodeId) => {
                    // Also remove all edges connected to this node
                    get().removeEdgesForNode(nodeId);

                    set((state) => {
                        state.nodes.delete(nodeId);
                    });
                },

                touchNode: (nodeId) => {
                    set((state) => {
                        const node = state.nodes.get(nodeId);
                        if (node) {
                            node.metadata.lastAccessedAt = new Date().toISOString();
                        }
                    });
                },

                // ======== Edge Actions ========

                addEdge: (sourceId, targetId, edgeType, weight = 1.0, metadata = {}) => {
                    // Validate source and target exist
                    const source = get().nodes.get(sourceId);
                    const target = get().nodes.get(targetId);

                    if (!source || !target) {
                        if (process.env.NODE_ENV === "development") {
                            console.warn(
                                `[GraphStore] Cannot create edge: missing node(s)`,
                                { sourceId, targetId, sourceExists: !!source, targetExists: !!target }
                            );
                        }
                        return null;
                    }

                    // Check for duplicate edge (same source, target, type)
                    const existingEdges = get().getEdgesForNode(sourceId, "out");
                    const duplicate = existingEdges.find(
                        (e) => e.targetId === targetId && e.relationType === edgeType
                    );
                    if (duplicate) {
                        // Update weight if higher
                        if (weight > duplicate.weight) {
                            set((state) => {
                                const edge = state.edges.get(duplicate.id);
                                if (edge) edge.weight = weight;
                            });
                        }
                        return duplicate;
                    }

                    const edgeId = generateEdgeId(sourceId, targetId, edgeType);
                    const edge: GraphEdge = {
                        id: edgeId,
                        sourceId,
                        targetId,
                        relationType: edgeType as RelationType,
                        weight,
                        metadata,
                        createdAt: new Date().toISOString(),
                    };

                    set((state) => {
                        state.edges.set(edgeId, edge);
                    });

                    return edge;
                },

                removeEdge: (edgeId) => {
                    set((state) => {
                        state.edges.delete(edgeId);
                    });
                },

                removeEdgesForNode: (nodeId) => {
                    set((state) => {
                        const toRemove: string[] = [];
                        state.edges.forEach((edge: GraphEdge, id: string) => {
                            if (edge.sourceId === nodeId || edge.targetId === nodeId) {
                                toRemove.push(id);
                            }
                        });
                        toRemove.forEach((id) => state.edges.delete(id));
                    });
                },

                // ======== Queries ========

                getNode: (nodeId) => get().nodes.get(nodeId),

                getNodeByEntity: (type, entityId) => {
                    const nodeId = entityKey({ type, id: entityId });
                    return get().nodes.get(nodeId);
                },

                getEdgesForNode: (nodeId, direction = "both") => {
                    const edges: GraphEdge[] = [];
                    get().edges.forEach((edge) => {
                        if (direction === "out" && edge.sourceId === nodeId) {
                            edges.push(edge);
                        } else if (direction === "in" && edge.targetId === nodeId) {
                            edges.push(edge);
                        } else if (direction === "both" && (edge.sourceId === nodeId || edge.targetId === nodeId)) {
                            edges.push(edge);
                        }
                    });
                    return edges;
                },

                getNeighbors: (nodeId, options = {}) => {
                    const {
                        depth = 1,
                        direction = "both",
                        edgeTypes,
                        maxNodes = 50,
                    } = options;

                    const visited = new Set<string>();
                    const resultNodes: GraphNode[] = [];
                    const resultEdges: GraphEdge[] = [];
                    const queue: Array<{ id: string; currentDepth: number }> = [{ id: nodeId, currentDepth: 0 }];

                    while (queue.length > 0 && resultNodes.length < maxNodes) {
                        const { id, currentDepth } = queue.shift()!;

                        if (visited.has(id)) continue;
                        visited.add(id);

                        const node = get().nodes.get(id);
                        if (node && id !== nodeId) {
                            resultNodes.push(node);
                        }

                        if (currentDepth < depth) {
                            const edges = get().getEdgesForNode(id, direction);
                            for (const edge of edges) {
                                // Filter by edge type if specified
                                if (edgeTypes && !edgeTypes.includes(edge.relationType as GraphEdgeType)) {
                                    continue;
                                }

                                resultEdges.push(edge);

                                const neighborId = edge.sourceId === id ? edge.targetId : edge.sourceId;
                                if (!visited.has(neighborId)) {
                                    queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
                                }
                            }
                        }
                    }

                    return {
                        nodes: resultNodes,
                        edges: resultEdges,
                        centerNodeId: nodeId,
                    };
                },

                // ======== Utilities ========

                clear: () => {
                    set((state) => {
                        state.nodes.clear();
                        state.edges.clear();
                    });
                },

                getNodeCount: () => get().nodes.size,
                getEdgeCount: () => get().edges.size,
            })),
            {
                name: "synapse-graph",
                // Custom serialization for Map
                storage: {
                    getItem: (name) => {
                        const str = localStorage.getItem(name);
                        if (!str) return null;
                        const parsed = JSON.parse(str);
                        return {
                            state: {
                                ...parsed.state,
                                nodes: new Map(parsed.state.nodes),
                                edges: new Map(parsed.state.edges),
                            },
                        };
                    },
                    setItem: (name, value) => {
                        const serialized = {
                            state: {
                                ...value.state,
                                nodes: Array.from(value.state.nodes.entries()),
                                edges: Array.from(value.state.edges.entries()),
                            },
                        };
                        localStorage.setItem(name, JSON.stringify(serialized));
                    },
                    removeItem: (name) => localStorage.removeItem(name),
                },
            }
        ),
        { name: "GraphStore" }
    )
);
