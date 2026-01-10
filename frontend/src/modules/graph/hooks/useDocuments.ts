/**
 * Graph Module - Document Hooks
 *
 * Query hooks for document-related graph data:
 * - Source documents for notes
 * - Documents for weak concepts
 * - Study materials recommendations
 */

import { useMemo } from "react";
import { useGraphStore, GraphEdgeType } from "../core/graphStore";
import type { GraphNode } from "../core/types";
import { useWeakConcepts } from "./useLearning";

// ============================================================================
// Types
// ============================================================================

export interface SourceDocumentsResult {
    /** Documents that are sources for this note */
    documents: GraphNode[];

    /** Whether there are source documents */
    hasSources: boolean;

    /** Count of source documents */
    sourceCount: number;
}

export interface DocumentMentionsResult {
    /** Notes mentioned by this document */
    mentionedNotes: GraphNode[];

    /** Count of mentions */
    mentionCount: number;
}

export interface StudyMaterialsResult {
    /** Documents related to weak concepts */
    documents: GraphNode[];

    /** Whether there are recommendations */
    hasRecommendations: boolean;
}

// ============================================================================
// useSourceDocuments
// ============================================================================

/**
 * Get documents that are sources for a note.
 * Traverses SOURCED_FROM, MENTIONS, EXTRACTED edges.
 *
 * @example
 * const { documents, hasSources } = useSourceDocuments(noteId);
 *
 * {hasSources && (
 *   <SourcesList documents={documents} />
 * )}
 */
export function useSourceDocuments(noteId: number): SourceDocumentsResult {
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);

    return useMemo(() => {
        const noteNodeId = `note:${noteId}`;
        const documentNodes: GraphNode[] = [];
        const seenDocIds = new Set<string>();

        // Find edges where this note is the target
        edges.forEach((edge) => {
            if (edge.targetId === noteNodeId) {
                const edgeType = edge.relationType;

                // Check if it's a document relationship edge
                if (
                    edgeType === (GraphEdgeType.SOURCED_FROM as string) ||
                    edgeType === (GraphEdgeType.MENTIONS as string) ||
                    edgeType === (GraphEdgeType.EXTRACTED as string)
                ) {
                    const sourceNode = getNode(edge.sourceId);

                    if (
                        sourceNode &&
                        sourceNode.entityType === "document" &&
                        !seenDocIds.has(sourceNode.id)
                    ) {
                        documentNodes.push(sourceNode);
                        seenDocIds.add(sourceNode.id);
                    }
                }
            }
        });

        return {
            documents: documentNodes,
            hasSources: documentNodes.length > 0,
            sourceCount: documentNodes.length,
        };
    }, [edges, getNode, noteId]);
}

// ============================================================================
// useDocumentMentions
// ============================================================================

/**
 * Get notes mentioned by a document.
 *
 * @example
 * const { mentionedNotes, mentionCount } = useDocumentMentions(documentId);
 */
export function useDocumentMentions(documentId: number): DocumentMentionsResult {
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);

    return useMemo(() => {
        const docNodeId = `document:${documentId}`;
        const mentionedNotes: GraphNode[] = [];

        edges.forEach((edge) => {
            if (
                edge.sourceId === docNodeId &&
                edge.relationType === (GraphEdgeType.MENTIONS as string)
            ) {
                const targetNode = getNode(edge.targetId);
                if (targetNode && targetNode.entityType === "note") {
                    mentionedNotes.push(targetNode);
                }
            }
        });

        return {
            mentionedNotes,
            mentionCount: mentionedNotes.length,
        };
    }, [edges, getNode, documentId]);
}

// ============================================================================
// useDocumentsForWeakConcepts
// ============================================================================

/**
 * Get documents related to the user's weak concepts.
 * These are high-value study materials.
 *
 * @example
 * const { documents, hasRecommendations } = useDocumentsForWeakConcepts();
 *
 * // "Recommended Study Materials"
 * {hasRecommendations && documents.map(doc => <DocumentCard doc={doc} />)}
 */
export function useDocumentsForWeakConcepts(): StudyMaterialsResult {
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);
    const { weakConcepts } = useWeakConcepts();

    return useMemo(() => {
        const recommendedDocIds = new Set<string>();

        for (const { concept } of weakConcepts) {
            // Find documents connected to this weak concept
            const conceptEdges = getEdgesForNode(concept.id, "both");

            for (const edge of conceptEdges) {
                const otherId = edge.sourceId === concept.id ? edge.targetId : edge.sourceId;
                const otherNode = getNode(otherId);

                if (otherNode?.entityType === "document") {
                    recommendedDocIds.add(otherId);
                }

                // Also check if concept is connected to a note that has document sources
                if (otherNode?.entityType === "note") {
                    // Find documents connected to this note
                    edges.forEach((e) => {
                        if (
                            e.targetId === otherId &&
                            (e.relationType === (GraphEdgeType.SOURCED_FROM as string) ||
                                e.relationType === (GraphEdgeType.MENTIONS as string))
                        ) {
                            const docNode = getNode(e.sourceId);
                            if (docNode?.entityType === "document") {
                                recommendedDocIds.add(e.sourceId);
                            }
                        }
                    });
                }
            }
        }

        const documents: GraphNode[] = [];
        for (const docId of recommendedDocIds) {
            const doc = getNode(docId);
            if (doc) {
                documents.push(doc);
            }
        }

        return {
            documents,
            hasRecommendations: documents.length > 0,
        };
    }, [edges, getNode, getEdgesForNode, weakConcepts]);
}

// ============================================================================
// useStudyMaterialsForToday
// ============================================================================

/**
 * Get study materials for today based on weak concepts and recent activity.
 * Combines weak concept documents with recently viewed documents.
 */
export function useStudyMaterialsForToday(): StudyMaterialsResult {
    const weakConceptDocs = useDocumentsForWeakConcepts();
    const nodes = useGraphStore((s) => s.nodes);

    return useMemo(() => {
        const allDocs = new Map<string, GraphNode>();

        // Add weak concept documents (priority)
        for (const doc of weakConceptDocs.documents) {
            allDocs.set(doc.id, doc);
        }

        // Add recently accessed documents (within last 7 days)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        nodes.forEach((node) => {
            if (node.entityType === "document" && !allDocs.has(node.id)) {
                const lastAccessed = node.metadata.lastAccessedAt as string | undefined;
                if (lastAccessed) {
                    const accessTime = new Date(lastAccessed).getTime();
                    if (accessTime > sevenDaysAgo) {
                        allDocs.set(node.id, node);
                    }
                }
            }
        });

        const documents = Array.from(allDocs.values());

        return {
            documents,
            hasRecommendations: documents.length > 0,
        };
    }, [weakConceptDocs.documents, nodes]);
}
