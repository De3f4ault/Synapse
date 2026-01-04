/**
 * Graph Module - Spaced Repetition Hooks
 *
 * Query hooks for spaced repetition based on graph decay:
 * - Due concepts needing review
 * - Overdue/forgotten items
 * - Daily study plan
 * - Forgetting curve visualization
 */

import { useMemo } from "react";
import { useGraphStore } from "../core/graphStore";
import { CURRENT_USER_NODE_ID } from "../core/learningConstants";
import {
    applyDecay,
    extractLearningMetadata,
    calculateReviewPriority,
    generateForgettingCurve,
    isLearningEdge,
    type DecayResult,
    DECAY_CONSTANTS,
} from "../core/decayEngine";
import type { GraphNode, GraphEdge } from "../core/types";

// ============================================================================
// Types
// ============================================================================

export interface DueItem {
    /** The concept/note node */
    node: GraphNode;

    /** The learning edge */
    edge: GraphEdge;

    /** Current decay state */
    decayState: DecayResult;

    /** Review priority (0-100, higher = more urgent) */
    priority: number;

    /** Edge type (mastery, weakness, practiced) */
    edgeType: string;
}

export interface DueConceptsResult {
    /** All items due for review, sorted by priority */
    dueItems: DueItem[];

    /** Items that are overdue (forgotten) */
    overdueItems: DueItem[];

    /** Total count of due items */
    dueCount: number;

    /** Count of overdue items */
    overdueCount: number;

    /** Whether there are any items to review */
    hasItemsToReview: boolean;
}

export interface DailyStudyPlanResult {
    /** Recommended items for today's study session */
    items: DueItem[];

    /** Recommended daily review count */
    recommendedCount: number;

    /** Estimated time in minutes */
    estimatedMinutes: number;

    /** Whether plan exists */
    hasPlan: boolean;
}

export interface ForgettingCurveResult {
    /** Data points for visualization */
    curve: Array<{ day: number; strength: number }>;

    /** Current strength */
    currentStrength: number;

    /** Days until due */
    daysUntilDue: number;

    /** Is currently due */
    isDue: boolean;
}

// ============================================================================
// useDueConcepts
// ============================================================================

/**
 * Get all concepts due for review.
 * Applies decay to all learning edges and returns due items sorted by priority.
 *
 * @example
 * const { dueItems, overdueItems, dueCount } = useDueConcepts();
 *
 * // Show urgent reviews
 * {overdueItems.map(item => (
 *   <OverdueCard key={item.edge.id} item={item} />
 * ))}
 */
export function useDueConcepts(): DueConceptsResult {
    const edges = useGraphStore((s) => s.edges);
    const getNode = useGraphStore((s) => s.getNode);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);

    return useMemo(() => {
        const now = Date.now();
        const dueItems: DueItem[] = [];
        const overdueItems: DueItem[] = [];

        // Get all learning edges from user node
        const userEdges = getEdgesForNode(CURRENT_USER_NODE_ID, "out");

        for (const edge of userEdges) {
            if (!isLearningEdge(edge.relationType)) continue;

            const metadata = extractLearningMetadata(edge.metadata);
            const decayState = applyDecay(metadata, edge.relationType, now);

            if (decayState.isDue || decayState.isOverdue) {
                const targetNode = getNode(edge.targetId);
                if (!targetNode) continue;

                const item: DueItem = {
                    node: targetNode,
                    edge,
                    decayState,
                    priority: calculateReviewPriority(decayState),
                    edgeType: edge.relationType,
                };

                if (decayState.isOverdue) {
                    overdueItems.push(item);
                }
                dueItems.push(item);
            }
        }

        // Sort by priority (highest first)
        dueItems.sort((a, b) => b.priority - a.priority);
        overdueItems.sort((a, b) => b.priority - a.priority);

        return {
            dueItems,
            overdueItems,
            dueCount: dueItems.length,
            overdueCount: overdueItems.length,
            hasItemsToReview: dueItems.length > 0,
        };
    }, [edges, getNode, getEdgesForNode]);
}

// ============================================================================
// useOverdueNotes
// ============================================================================

/**
 * Get notes that are connected to overdue concepts.
 * These are notes the user might be forgetting.
 */
export function useOverdueNotes(): {
    notes: GraphNode[];
    count: number;
    hasOverdue: boolean;
} {
    const { overdueItems } = useDueConcepts();
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);
    const getNode = useGraphStore((s) => s.getNode);

    return useMemo(() => {
        const noteIds = new Set<string>();

        for (const item of overdueItems) {
            // Find notes connected to this concept
            const conceptEdges = getEdgesForNode(item.node.id, "both");

            for (const edge of conceptEdges) {
                const otherId = edge.sourceId === item.node.id ? edge.targetId : edge.sourceId;
                const otherNode = getNode(otherId);

                if (otherNode?.entityType === "note") {
                    noteIds.add(otherId);
                }
            }

            // Also include if the item itself is a note
            if (item.node.entityType === "note") {
                noteIds.add(item.node.id);
            }
        }

        const notes: GraphNode[] = [];
        for (const noteId of noteIds) {
            const note = getNode(noteId);
            if (note) notes.push(note);
        }

        return {
            notes,
            count: notes.length,
            hasOverdue: notes.length > 0,
        };
    }, [overdueItems, getEdgesForNode, getNode]);
}

// ============================================================================
// useDailyStudyPlan
// ============================================================================

const DEFAULT_DAILY_ITEMS = 20;
const MINUTES_PER_ITEM = 2;

/**
 * Get a recommended study plan for today.
 * Prioritizes overdue items, then due items.
 *
 * @param maxItems - Maximum items to include (default: 20)
 */
export function useDailyStudyPlan(maxItems: number = DEFAULT_DAILY_ITEMS): DailyStudyPlanResult {
    const { dueItems, overdueItems } = useDueConcepts();

    return useMemo(() => {
        // Prioritize overdue items
        const prioritized = [...overdueItems];

        // Add due (non-overdue) items
        for (const item of dueItems) {
            if (!overdueItems.includes(item)) {
                prioritized.push(item);
            }
        }

        // Take top N items
        const items = prioritized.slice(0, maxItems);

        return {
            items,
            recommendedCount: Math.min(maxItems, dueItems.length),
            estimatedMinutes: items.length * MINUTES_PER_ITEM,
            hasPlan: items.length > 0,
        };
    }, [dueItems, overdueItems, maxItems]);
}

// ============================================================================
// useForgettingCurve
// ============================================================================

/**
 * Get forgetting curve data for a specific concept.
 * Useful for visualizing decay over time.
 *
 * @param conceptId - ID of the concept node
 * @param daysAhead - Days to project (default: 30)
 */
export function useForgettingCurve(
    conceptId: string,
    daysAhead: number = 30
): ForgettingCurveResult | null {
    const edges = useGraphStore((s) => s.edges);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);

    return useMemo(() => {
        // Find the learning edge for this concept
        const userEdges = getEdgesForNode(CURRENT_USER_NODE_ID, "out");

        const learningEdge = userEdges.find(
            (e) => e.targetId === conceptId && isLearningEdge(e.relationType)
        );

        if (!learningEdge) return null;

        const metadata = extractLearningMetadata(learningEdge.metadata);
        const decayState = applyDecay(metadata, learningEdge.relationType);

        const curve = generateForgettingCurve(
            metadata,
            learningEdge.relationType,
            daysAhead
        );

        return {
            curve,
            currentStrength: decayState.strength,
            daysUntilDue: decayState.daysUntilDue,
            isDue: decayState.isDue,
        };
    }, [edges, getEdgesForNode, conceptId, daysAhead]);
}

// ============================================================================
// useStudyStreak
// ============================================================================

export interface StudyStreakResult {
    /** Current streak in days */
    currentStreak: number;

    /** Whether user studied today */
    studiedToday: boolean;

    /** Total concepts reviewed all time */
    totalReviewed: number;
}

/**
 * Get study streak information.
 * Based on reinforcement timestamps in learning edges.
 */
export function useStudyStreak(): StudyStreakResult {
    const edges = useGraphStore((s) => s.edges);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);

    return useMemo(() => {
        const now = Date.now();
        const today = new Date(now).setHours(0, 0, 0, 0);

        const userEdges = getEdgesForNode(CURRENT_USER_NODE_ID, "out");
        const reviewDates = new Set<number>();
        let totalReviewed = 0;

        for (const edge of userEdges) {
            if (!isLearningEdge(edge.relationType)) continue;

            const metadata = extractLearningMetadata(edge.metadata);
            totalReviewed += metadata.successCount + metadata.failCount;

            // Track unique review dates
            const reviewDate = new Date(metadata.lastReviewedAt).setHours(0, 0, 0, 0);
            reviewDates.add(reviewDate);
        }

        // Calculate streak
        let currentStreak = 0;
        let checkDate = today;

        while (reviewDates.has(checkDate)) {
            currentStreak++;
            checkDate -= DECAY_CONSTANTS.MS_PER_DAY;
        }

        return {
            currentStreak,
            studiedToday: reviewDates.has(today),
            totalReviewed,
        };
    }, [edges, getEdgesForNode]);
}

// ============================================================================
// useNextReviewTime
// ============================================================================

/**
 * Get the time until the next review is due.
 */
export function useNextReviewTime(): {
    nextReviewIn: string;
    nextReviewTimestamp: number | null;
    hasUpcoming: boolean;
} {
    const edges = useGraphStore((s) => s.edges);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);

    return useMemo(() => {
        const now = Date.now();
        let earliestDue: number | null = null;

        const userEdges = getEdgesForNode(CURRENT_USER_NODE_ID, "out");

        for (const edge of userEdges) {
            if (!isLearningEdge(edge.relationType)) continue;

            const metadata = extractLearningMetadata(edge.metadata);
            const decayState = applyDecay(metadata, edge.relationType, now);

            if (decayState.isDue) {
                // Already due
                return {
                    nextReviewIn: "Now",
                    nextReviewTimestamp: now,
                    hasUpcoming: true,
                };
            }

            const dueTimestamp =
                metadata.lastReviewedAt +
                decayState.daysUntilDue * DECAY_CONSTANTS.MS_PER_DAY;

            if (earliestDue === null || dueTimestamp < earliestDue) {
                earliestDue = dueTimestamp;
            }
        }

        if (earliestDue === null) {
            return {
                nextReviewIn: "No items",
                nextReviewTimestamp: null,
                hasUpcoming: false,
            };
        }

        const hoursUntil = (earliestDue - now) / (60 * 60 * 1000);
        let nextReviewIn: string;

        if (hoursUntil < 1) {
            nextReviewIn = `${Math.round(hoursUntil * 60)} minutes`;
        } else if (hoursUntil < 24) {
            nextReviewIn = `${Math.round(hoursUntil)} hours`;
        } else {
            nextReviewIn = `${Math.round(hoursUntil / 24)} days`;
        }

        return {
            nextReviewIn,
            nextReviewTimestamp: earliestDue,
            hasUpcoming: true,
        };
    }, [edges, getEdgesForNode]);
}
