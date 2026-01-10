/**
 * Graph Module - Learning Hooks
 *
 * Query hooks for learning intelligence data:
 * - Weak concepts
 * - Mastered concepts
 * - Recommended notes based on learning state
 */

import { useMemo } from "react";
import { useGraphStore, GraphEdgeType } from "../core/graphStore";
import { CURRENT_USER_NODE_ID } from "../core/learningConstants";
import type { GraphNode } from "../core/types";

// ============================================================================
// Types
// ============================================================================

export interface ConceptStrength {
    concept: GraphNode;
    weight: number;
    lastUpdatedAt: string | undefined;
}

export interface WeakConceptsResult {
    /** Concepts the user is weak in, sorted by weight (highest first) */
    weakConcepts: ConceptStrength[];

    /** Total number of weak concepts */
    weakCount: number;

    /** Whether user has any weaknesses */
    hasWeaknesses: boolean;
}

export interface MasteredConceptsResult {
    /** Concepts the user has mastered */
    masteredConcepts: GraphNode[];

    /** Total number of mastered concepts */
    masteryCount: number;
}

export interface RecommendedNotesResult {
    /** Notes related to weak concepts */
    notes: GraphNode[];

    /** Whether there are recommendations */
    hasRecommendations: boolean;
}

// ============================================================================
// useWeakConcepts
// ============================================================================

/**
 * Get concepts the user is weak in.
 * Sorted by weakness weight (highest = most significant weakness).
 *
 * @example
 * const { weakConcepts, weakCount } = useWeakConcepts();
 *
 * // Show weak areas
 * {weakConcepts.map(({ concept, weight }) => (
 *   <WeakConceptCard key={concept.id} concept={concept} severity={weight} />
 * ))}
 */
export function useWeakConcepts(): WeakConceptsResult {
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);

    return useMemo(() => {
        const userEdges = getEdgesForNode(CURRENT_USER_NODE_ID, "out");

        const weaknessEdges = userEdges.filter(
            (e) => e.relationType === (GraphEdgeType.WEAKNESS as string)
        );

        const weakConcepts: ConceptStrength[] = [];

        for (const edge of weaknessEdges) {
            const concept = getNode(edge.targetId);
            if (concept) {
                weakConcepts.push({
                    concept,
                    weight: edge.weight,
                    lastUpdatedAt: edge.metadata.lastUpdatedAt as string | undefined,
                });
            }
        }

        // Sort by weight descending (highest weakness first)
        weakConcepts.sort((a, b) => b.weight - a.weight);

        return {
            weakConcepts,
            weakCount: weakConcepts.length,
            hasWeaknesses: weakConcepts.length > 0,
        };
    }, [edges, getNode, getEdgesForNode]);
}

// ============================================================================
// useMasteredConcepts
// ============================================================================

/**
 * Get concepts the user has mastered.
 *
 * @example
 * const { masteredConcepts, masteryCount } = useMasteredConcepts();
 */
export function useMasteredConcepts(): MasteredConceptsResult {
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);

    return useMemo(() => {
        const userEdges = getEdgesForNode(CURRENT_USER_NODE_ID, "out");

        const masteryEdges = userEdges.filter(
            (e) => e.relationType === (GraphEdgeType.MASTERY as string)
        );

        const masteredConcepts: GraphNode[] = [];

        for (const edge of masteryEdges) {
            const concept = getNode(edge.targetId);
            if (concept) {
                masteredConcepts.push(concept);
            }
        }

        return {
            masteredConcepts,
            masteryCount: masteredConcepts.length,
        };
    }, [edges, getNode, getEdgesForNode]);
}

// ============================================================================
// useRecommendedNotes
// ============================================================================

/**
 * Get notes that are related to the user's weak concepts.
 * These are high-value notes for the user to review.
 *
 * @example
 * const { notes, hasRecommendations } = useRecommendedNotes();
 *
 * // "Recommended for you"
 * {hasRecommendations && notes.map(note => <NoteCard note={note} />)}
 */
export function useRecommendedNotes(): RecommendedNotesResult {
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);
    const { weakConcepts } = useWeakConcepts();

    return useMemo(() => {
        const recommendedNoteIds = new Set<string>();

        for (const { concept } of weakConcepts) {
            // Find notes connected to this weak concept
            const conceptEdges = getEdgesForNode(concept.id, "both");

            for (const edge of conceptEdges) {
                const otherId = edge.sourceId === concept.id ? edge.targetId : edge.sourceId;
                const otherNode = getNode(otherId);

                if (otherNode?.entityType === "note") {
                    recommendedNoteIds.add(otherId);
                }
            }
        }

        const notes: GraphNode[] = [];
        for (const noteId of recommendedNoteIds) {
            const note = getNode(noteId);
            if (note) {
                notes.push(note);
            }
        }

        return {
            notes,
            hasRecommendations: notes.length > 0,
        };
    }, [edges, getNode, getEdgesForNode, weakConcepts]);
}

// ============================================================================
// useLearningProgress
// ============================================================================

export interface LearningProgressResult {
    /** Total concepts the user has interacted with */
    totalConcepts: number;

    /** Number of mastered concepts */
    masteredCount: number;

    /** Number of weak concepts */
    weakCount: number;

    /** Progress percentage (mastered / total) */
    progressPercentage: number;
}

/**
 * Get overall learning progress stats.
 */
export function useLearningProgress(): LearningProgressResult {
    const { masteredConcepts, masteryCount } = useMasteredConcepts();
    const { weakConcepts, weakCount } = useWeakConcepts();

    return useMemo(() => {
        // Get all unique concepts from both mastered and weak
        const allConceptIds = new Set<string>();

        for (const concept of masteredConcepts) {
            allConceptIds.add(concept.id);
        }
        for (const { concept } of weakConcepts) {
            allConceptIds.add(concept.id);
        }

        const totalConcepts = allConceptIds.size;
        const progressPercentage =
            totalConcepts > 0 ? (masteryCount / totalConcepts) * 100 : 0;

        return {
            totalConcepts,
            masteredCount: masteryCount,
            weakCount,
            progressPercentage,
        };
    }, [masteredConcepts, weakConcepts, masteryCount, weakCount]);
}
