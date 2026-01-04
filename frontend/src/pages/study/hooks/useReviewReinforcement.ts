/**
 * useReviewReinforcement - Bridge between Study Session and Graph Decay
 *
 * ARCHITECTURE:
 * - Called after API review succeeds
 * - Updates graph edges (decay, mastery, weakness)
 * - Edge-agnostic design (handles multiple concept types)
 * - Emits learning events for analytics
 *
 * INVARIANT:
 * - Graph update happens AFTER API success
 * - Never reflects a review that failed to persist
 * - Clamped strength [0.2, 1.0]
 * - One reinforcement per item per session (guardrail)
 */

import { useCallback, useRef } from "react";
import { useGraphStore, GraphEdgeType, nodeIdFromEntity } from "@/modules/graph";
import {
    extractLearningMetadata,
    reinforceSuccess,
    reinforceFailure,
    createLearningMetadata,
} from "@/modules/graph/core/decayEngine";
import { CURRENT_USER_NODE_ID } from "@/modules/graph/core/learningConstants";
import { flashcardRef, quizRef, noteRef } from "@/shared/entities";
import { EventBus, EventTypes, createEvent } from "@/shared/events";
import type { StudyItem } from "../types/study.types";

// ============================================================================
// Guardrails
// ============================================================================

/** Minimum edge strength (never drop below) */
const MIN_STRENGTH = 0.2;

/** Maximum edge strength */
const MAX_STRENGTH = 1.0;

/** Clamp strength to valid range */
function clampStrength(strength: number): number {
    return Math.max(MIN_STRENGTH, Math.min(MAX_STRENGTH, strength));
}

// ============================================================================
// Types
// ============================================================================

export interface LearningContext {
    /** Concept/entity node ID in the graph */
    nodeId: string;

    /** Type of learning edge */
    edgeType: GraphEdgeType.PRACTICED | GraphEdgeType.WEAKNESS | GraphEdgeType.MASTERY;

    /** Entity type for labeling */
    entityType: "flashcard" | "quiz" | "note" | "concept";

    /** Human-readable label */
    label: string;
}

export interface ReinforcementResult {
    /** Whether reinforcement was applied */
    applied: boolean;

    /** Edge that was updated (if any) */
    edgeId?: string;

    /** New strength after update */
    newStrength?: number;

    /** Whether this created a new edge */
    isNewEdge?: boolean;
}

export interface UseReviewReinforcementReturn {
    /** Reinforce after correct answer */
    reinforceCorrect: (item: StudyItem) => ReinforcementResult;

    /** Reinforce after incorrect answer */
    reinforceIncorrect: (item: StudyItem) => ReinforcementResult;

    /** Get learning context for an item (for display) */
    resolveLearningContext: (item: StudyItem) => LearningContext | null;

    /** Session stats for completion screen */
    sessionStats: {
        strengthened: number;
        weakened: number;
        newEdges: number;
    };

    /** Reset session stats */
    resetSessionStats: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useReviewReinforcement(): UseReviewReinforcementReturn {
    const getNode = useGraphStore((s) => s.getNode);
    const getEdgesForNode = useGraphStore((s) => s.getEdgesForNode);

    // Session tracking
    const sessionStatsRef = useRef({
        strengthened: 0,
        weakened: 0,
        newEdges: 0,
    });

    // Guardrail: prevent double-reinforcement per item per session
    const reinforcedThisSessionRef = useRef(new Set<string>());

    // ========== Resolve Learning Context ==========

    const resolveLearningContext = useCallback(
        (item: StudyItem): LearningContext | null => {
            let entityRef;
            let entityType: LearningContext["entityType"];

            switch (item.type) {
                case "flashcard":
                    entityRef = flashcardRef(item.id);
                    entityType = "flashcard";
                    break;
                case "quiz":
                    entityRef = quizRef(item.id);
                    entityType = "quiz";
                    break;
                case "note":
                    entityRef = noteRef(item.id);
                    entityType = "note";
                    break;
                default:
                    return null;
            }

            const nodeId = nodeIdFromEntity(entityRef);

            // Determine edge type based on existing edges
            const userEdges = getEdgesForNode(CURRENT_USER_NODE_ID, "out");
            const existingEdge = userEdges.find((e) => e.targetId === nodeId);

            let edgeType: LearningContext["edgeType"] = GraphEdgeType.PRACTICED;
            if (existingEdge) {
                if (existingEdge.relationType === (GraphEdgeType.MASTERY as string)) {
                    edgeType = GraphEdgeType.MASTERY;
                } else if (existingEdge.relationType === (GraphEdgeType.WEAKNESS as string)) {
                    edgeType = GraphEdgeType.WEAKNESS;
                }
            }

            return {
                nodeId,
                edgeType,
                entityType,
                label: item.title || `${entityType} ${item.id}`,
            };
        },
        [getEdgesForNode]
    );

    // ========== Find or Create Learning Edge ==========

    const findOrCreateLearningEdge = useCallback(
        (item: StudyItem): { edgeId: string; isNew: boolean } | null => {
            const context = resolveLearningContext(item);
            if (!context) return null;

            const store = useGraphStore.getState();

            // Ensure entity node exists
            if (!getNode(context.nodeId)) {
                let entityRef;
                switch (item.type) {
                    case "flashcard":
                        entityRef = flashcardRef(item.id);
                        break;
                    case "quiz":
                        entityRef = quizRef(item.id);
                        break;
                    case "note":
                        entityRef = noteRef(item.id);
                        break;
                    default:
                        return null;
                }

                store.addNode(entityRef, context.label, {
                    itemType: item.type,
                    createdFromReview: true,
                });
            }

            // Find existing learning edge from user to this entity
            const userEdges = store.getEdgesForNode(CURRENT_USER_NODE_ID, "out");
            const existingEdge = userEdges.find(
                (e) =>
                    e.targetId === context.nodeId &&
                    (e.relationType === (GraphEdgeType.PRACTICED as string) ||
                        e.relationType === (GraphEdgeType.MASTERY as string) ||
                        e.relationType === (GraphEdgeType.WEAKNESS as string))
            );

            if (existingEdge) {
                return { edgeId: existingEdge.id, isNew: false };
            }

            // Create new PRACTICED edge
            const newEdge = store.addEdge(
                CURRENT_USER_NODE_ID,
                context.nodeId,
                GraphEdgeType.PRACTICED,
                1.0,
                { ...createLearningMetadata() }
            );

            if (newEdge) {
                sessionStatsRef.current.newEdges++;
                return { edgeId: newEdge.id, isNew: true };
            }

            return null;
        },
        [resolveLearningContext, getNode]
    );

    // ========== Reinforce Correct ==========

    const reinforceCorrect = useCallback(
        (item: StudyItem): ReinforcementResult => {
            const itemKey = `${item.type}:${item.id}`;

            // Guardrail: prevent double-reinforcement
            if (reinforcedThisSessionRef.current.has(itemKey)) {
                if (process.env.NODE_ENV === "development") {
                    console.debug(`[ReviewReinforcement] Skipped (already reinforced): ${item.title}`);
                }
                return { applied: false };
            }

            const edgeInfo = findOrCreateLearningEdge(item);
            if (!edgeInfo) {
                return { applied: false };
            }

            const store = useGraphStore.getState();
            const edge = store.edges.get(edgeInfo.edgeId);
            if (!edge) {
                return { applied: false };
            }

            const oldMetadata = extractLearningMetadata(edge.metadata);
            const newMetadata = reinforceSuccess(oldMetadata);

            // Guardrail: clamp strength
            const clampedStrength = clampStrength(newMetadata.strength);

            // Update edge metadata
            edge.metadata = {
                ...edge.metadata,
                ...newMetadata,
                strength: clampedStrength,
            };
            edge.weight = clampedStrength;

            // Mark as reinforced this session
            reinforcedThisSessionRef.current.add(itemKey);
            sessionStatsRef.current.strengthened++;

            // Emit event
            EventBus.emit(createEvent(
                edgeInfo.isNew ? EventTypes.LEARNING_FIRST_REVIEW : EventTypes.LEARNING_STRENGTHENED,
                {
                    itemId: item.id,
                    itemType: item.type,
                    newStrength: clampedStrength,
                    isCorrect: true,
                }
            ));

            if (process.env.NODE_ENV === "development") {
                console.debug(
                    `[ReviewReinforcement] Correct: ${item.title}, strength: ${clampedStrength.toFixed(2)}`
                );
            }

            return {
                applied: true,
                edgeId: edgeInfo.edgeId,
                newStrength: clampedStrength,
                isNewEdge: edgeInfo.isNew,
            };
        },
        [findOrCreateLearningEdge]
    );

    // ========== Reinforce Incorrect ==========

    const reinforceIncorrect = useCallback(
        (item: StudyItem): ReinforcementResult => {
            const itemKey = `${item.type}:${item.id}`;

            // Guardrail: prevent double-reinforcement
            if (reinforcedThisSessionRef.current.has(itemKey)) {
                if (process.env.NODE_ENV === "development") {
                    console.debug(`[ReviewReinforcement] Skipped (already reinforced): ${item.title}`);
                }
                return { applied: false };
            }

            const edgeInfo = findOrCreateLearningEdge(item);
            if (!edgeInfo) {
                return { applied: false };
            }

            const store = useGraphStore.getState();
            const edge = store.edges.get(edgeInfo.edgeId);
            if (!edge) {
                return { applied: false };
            }

            const oldMetadata = extractLearningMetadata(edge.metadata);
            const newMetadata = reinforceFailure(oldMetadata);

            // Guardrail: clamp strength
            const clampedStrength = clampStrength(newMetadata.strength);

            // Update edge metadata
            edge.metadata = {
                ...edge.metadata,
                ...newMetadata,
                strength: clampedStrength,
            };
            edge.weight = clampedStrength;

            // Consider promoting to WEAKNESS edge if stability is low
            if (newMetadata.stability < 1.0 && newMetadata.failCount >= 2) {
                edge.relationType = GraphEdgeType.WEAKNESS as any;
            }

            // Mark as reinforced this session
            reinforcedThisSessionRef.current.add(itemKey);
            sessionStatsRef.current.weakened++;

            // Emit event
            EventBus.emit(createEvent(
                EventTypes.LEARNING_WEAKENED,
                {
                    itemId: item.id,
                    itemType: item.type,
                    newStrength: clampedStrength,
                    isCorrect: false,
                    isWeakness: newMetadata.stability < 1.0 && newMetadata.failCount >= 2,
                }
            ));

            if (process.env.NODE_ENV === "development") {
                console.debug(
                    `[ReviewReinforcement] Incorrect: ${item.title}, strength: ${clampedStrength.toFixed(2)}`
                );
            }

            return {
                applied: true,
                edgeId: edgeInfo.edgeId,
                newStrength: clampedStrength,
                isNewEdge: edgeInfo.isNew,
            };
        },
        [findOrCreateLearningEdge]
    );

    // ========== Reset Session Stats ==========

    const resetSessionStats = useCallback(() => {
        sessionStatsRef.current = {
            strengthened: 0,
            weakened: 0,
            newEdges: 0,
        };
        reinforcedThisSessionRef.current.clear();
    }, []);

    return {
        reinforceCorrect,
        reinforceIncorrect,
        resolveLearningContext,
        sessionStats: sessionStatsRef.current,
        resetSessionStats,
    };
}
