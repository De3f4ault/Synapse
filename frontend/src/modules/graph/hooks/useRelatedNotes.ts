/**
 * Graph Module - Related Notes Hook
 *
 * Query hook for getting notes related to a given note.
 *
 * SEMANTICS:
 * - backlinks: Notes that link TO this note (incoming edges)
 * - outlinks: Notes this note links TO (outgoing edges)
 * - related: 2-hop neighbors (notes connected through shared links)
 */

import { useMemo } from "react";
import { useGraphStore, GraphEdgeType, nodeIdFromEntity } from "../core/graphStore";
import { noteRef, type EntityRef } from "@/shared/entities";
import type { GraphNode, GraphEdge } from "../core/types";

// ============================================================================
// Types
// ============================================================================

export interface RelatedNotesResult {
    /**
     * Notes that link TO this note.
     * These are incoming wikilinks.
     */
    backlinks: GraphNode[];

    /**
     * Notes this note links TO.
     * These are outgoing wikilinks.
     */
    outlinks: GraphNode[];

    /**
     * Notes connected within 2 hops.
     * Excludes direct links (already in backlinks/outlinks).
     */
    related: GraphNode[];

    /**
     * All edges involving this note.
     */
    edges: GraphEdge[];

    /**
     * Total connection count.
     */
    connectionCount: number;

    /**
     * Whether the note has any graph data.
     */
    hasGraphData: boolean;
}

export interface UseRelatedNotesOptions {
    /**
     * Depth for "related" notes query.
     * @default 2
     */
    relatedDepth?: number;

    /**
     * Maximum related notes to return.
     * @default 10
     */
    maxRelated?: number;

    /**
     * Filter edges by type.
     * @default [WIKILINK]
     */
    edgeTypes?: GraphEdgeType[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Get notes related to the given note via graph edges.
 *
 * @param noteId - The note ID to find relations for
 * @param options - Query options
 *
 * @example
 * const { backlinks, outlinks, related, connectionCount } = useRelatedNotes(123);
 *
 * // Show in UI
 * <BacklinksSection notes={backlinks} />
 * <OutlinksSection notes={outlinks} />
 * {related.length > 0 && <RelatedSection notes={related} />}
 */
export function useRelatedNotes(
    noteId: number | undefined,
    options: UseRelatedNotesOptions = {}
): RelatedNotesResult {
    const { relatedDepth = 2, maxRelated = 10, edgeTypes = [GraphEdgeType.WIKILINK] } = options;

    // Subscribe to graph store
    const nodes = useGraphStore((s) => s.nodes);
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);
    const getNeighbors = useGraphStore((s) => s.getNeighbors);

    return useMemo(() => {
        // Default empty result
        const emptyResult: RelatedNotesResult = {
            backlinks: [],
            outlinks: [],
            related: [],
            edges: [],
            connectionCount: 0,
            hasGraphData: false,
        };

        if (!noteId) return emptyResult;

        // Get node ID
        const entity = noteRef(noteId);
        const nodeId = nodeIdFromEntity(entity);
        const node = getNode(nodeId);

        if (!node) return emptyResult;

        // Get direct edges
        const allEdges = getEdgesForNode(nodeId, "both");
        const filteredEdges = allEdges.filter((e) =>
            edgeTypes.includes(e.relationType as GraphEdgeType)
        );

        // Separate backlinks (incoming) and outlinks (outgoing)
        const backlinks: GraphNode[] = [];
        const outlinks: GraphNode[] = [];
        const directNeighborIds = new Set<string>();

        for (const edge of filteredEdges) {
            if (edge.targetId === nodeId) {
                // Incoming edge (backlink)
                const sourceNode = getNode(edge.sourceId);
                if (sourceNode && sourceNode.entityType === "note") {
                    backlinks.push(sourceNode);
                    directNeighborIds.add(edge.sourceId);
                }
            } else if (edge.sourceId === nodeId) {
                // Outgoing edge (outlink)
                const targetNode = getNode(edge.targetId);
                if (targetNode && targetNode.entityType === "note") {
                    outlinks.push(targetNode);
                    directNeighborIds.add(edge.targetId);
                }
            }
        }

        // Get 2-hop neighbors for "related" (excluding direct links)
        const subgraph = getNeighbors(nodeId, {
            depth: relatedDepth,
            direction: "both",
            edgeTypes,
            maxNodes: maxRelated + directNeighborIds.size + 1, // Extra buffer
        });

        const related = subgraph.nodes
            .filter(
                (n) =>
                    n.entityType === "note" &&
                    n.id !== nodeId &&
                    !directNeighborIds.has(n.id)
            )
            .slice(0, maxRelated);

        return {
            backlinks,
            outlinks,
            related,
            edges: filteredEdges,
            connectionCount: backlinks.length + outlinks.length,
            hasGraphData: true,
        };
    }, [
        noteId,
        nodes,
        edges,
        getNode,
        getEdgesForNode,
        getNeighbors,
        relatedDepth,
        maxRelated,
        edgeTypes,
    ]);
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Get just the backlink count for a note.
 * Useful for badges/indicators.
 */
export function useBacklinkCount(noteId: number | undefined): number {
    const { backlinks } = useRelatedNotes(noteId);
    return backlinks.length;
}

/**
 * Check if a note has any connections in the graph.
 */
export function useHasConnections(noteId: number | undefined): boolean {
    const { connectionCount } = useRelatedNotes(noteId);
    return connectionCount > 0;
}

/**
 * Get graph node for an entity.
 */
export function useGraphNode(entity: EntityRef | undefined): GraphNode | undefined {
    const getNode = useGraphStore((s) => s.getNode);

    return useMemo(() => {
        if (!entity) return undefined;
        return getNode(nodeIdFromEntity(entity));
    }, [entity, getNode]);
}
