/**
 * Graph Module - Learning Handlers
 *
 * Handles quiz events to create learning intelligence edges:
 * - PRACTICED: User practiced a concept
 * - MASTERY: User demonstrates mastery
 * - WEAKNESS: User has weakness in concept
 *
 * ARCHITECTURE:
 * - Subscribes to quiz.* events via shared EventBus
 * - Creates/updates edges based on learning thresholds
 * - No direct coupling to Quizzes module internals
 */

import { EventBus, EventTypes, matchesEventType, type EventEnvelope } from "@/shared/events";
import { quizRef } from "@/shared/entities";
import { useGraphStore, GraphEdgeType, nodeIdFromEntity } from "./graphStore";
import {
    MASTERY_ACCURACY_THRESHOLD,
    MASTERY_MIN_ATTEMPTS,
    WEAKNESS_INITIAL_WEIGHT,
    WEAKNESS_WEIGHT_INCREMENT,
    WEAKNESS_WEIGHT_MAX,
    WEAKNESS_IMPROVEMENT_REDUCTION,
    WEAKNESS_REMOVAL_THRESHOLD,
    CURRENT_USER_NODE_ID,
} from "./learningConstants";

// ============================================================================
// Types
// ============================================================================

interface QuizCompletedPayload {
    quizId?: number;
    attemptId?: number;
    score: number;
    percentage: number;
    duration: number;
}

interface QuestionAnsweredPayload {
    quizId?: number;
    attemptId?: number;
    questionId: number;
    isCorrect: boolean;
    timeSpent: number;
    // Optional: concept/topic the question tests
    conceptId?: number;
    conceptLabel?: string;
}

// ============================================================================
// Learning State Tracking
// ============================================================================

/**
 * In-memory tracking of user's performance on concepts.
 * Used to determine when mastery is achieved.
 */
interface ConceptPerformance {
    correctCount: number;
    totalCount: number;
    lastAttemptAt: string;
    attempts: Array<{
        isCorrect: boolean;
        timestamp: string;
    }>;
}

const conceptPerformance = new Map<string, ConceptPerformance>();

function getConceptKey(conceptId: number): string {
    return `concept:${conceptId}`;
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;
let unsubscribe: (() => void) | null = null;

/**
 * Initialize learning handlers.
 * Call once at app startup, after initGraphHandlers.
 */
export function initLearningHandlers(): () => void {
    if (initialized) {
        console.warn("[LearningHandlers] Already initialized");
        return () => { };
    }

    initialized = true;

    // Subscribe to quiz events
    unsubscribe = EventBus.subscribe("quiz.*", handleQuizEvent);

    // Ensure user node exists
    ensureUserNode();

    if (process.env.NODE_ENV === "development") {
        console.log("[LearningHandlers] Initialized - listening for quiz events");
    }

    return () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        initialized = false;
    };
}

// ============================================================================
// Event Handler
// ============================================================================

function handleQuizEvent(envelope: EventEnvelope): void {
    if (matchesEventType(envelope, EventTypes.QUIZ_COMPLETED)) {
        handleQuizCompleted(envelope);
    } else if (matchesEventType(envelope, EventTypes.QUIZ_QUESTION_ANSWERED)) {
        handleQuestionAnswered(envelope);
    }
}

// ============================================================================
// Quiz Completed Handler
// ============================================================================

function handleQuizCompleted(envelope: EventEnvelope): void {
    const payload = envelope.payload as QuizCompletedPayload;
    const quizId = payload.quizId ?? (envelope.entity?.id as number);

    if (!quizId) return;

    const store = useGraphStore.getState();

    // Ensure quiz node exists
    const quizEntity = quizRef(quizId);
    const quizNodeId = nodeIdFromEntity(quizEntity);

    if (!store.getNode(quizNodeId)) {
        store.addNode(quizEntity, `Quiz ${quizId}`, {
            score: payload.score,
            percentage: payload.percentage,
            completedAt: envelope.timestamp,
        });
    }

    // Create PRACTICED edge: Quiz → (implicit concepts, handled by question events)
    // The actual concept linking happens in handleQuestionAnswered

    if (process.env.NODE_ENV === "development") {
        console.debug(
            `[LearningHandlers] Quiz completed: ${quizId}, score: ${payload.score}%`
        );
    }
}

// ============================================================================
// Question Answered Handler
// ============================================================================

function handleQuestionAnswered(envelope: EventEnvelope): void {
    const payload = envelope.payload as QuestionAnsweredPayload;
    const { questionId, isCorrect, conceptId, conceptLabel } = payload;

    // If no concept attached, we can't create learning edges
    if (!conceptId) {
        if (process.env.NODE_ENV === "development") {
            console.debug(
                `[LearningHandlers] Question ${questionId} has no conceptId, skipping learning edge`
            );
        }
        return;
    }

    const store = useGraphStore.getState();
    const conceptKey = getConceptKey(conceptId);

    // Ensure concept node exists
    const conceptNodeId = `concept:${conceptId}`;
    if (!store.getNode(conceptNodeId)) {
        store.addNode(
            { type: "concept", id: conceptId },
            conceptLabel || `Concept ${conceptId}`,
            { isLearningConcept: true }
        );
    }

    // Update performance tracking
    const perf = conceptPerformance.get(conceptKey) ?? {
        correctCount: 0,
        totalCount: 0,
        lastAttemptAt: "",
        attempts: [],
    };

    perf.totalCount++;
    if (isCorrect) perf.correctCount++;
    perf.lastAttemptAt = envelope.timestamp;
    perf.attempts.push({ isCorrect, timestamp: envelope.timestamp });

    // Limit attempt history to recent
    if (perf.attempts.length > 20) {
        perf.attempts = perf.attempts.slice(-20);
    }

    conceptPerformance.set(conceptKey, perf);

    // Calculate current accuracy
    const accuracy = (perf.correctCount / perf.totalCount) * 100;

    // Process learning edges
    if (isCorrect) {
        handleCorrectAnswer(conceptNodeId, accuracy, perf);
    } else {
        handleWrongAnswer(conceptNodeId, accuracy, perf);
    }

    if (process.env.NODE_ENV === "development") {
        console.debug(
            `[LearningHandlers] Question ${questionId} answered (${isCorrect ? "✓" : "✗"}), ` +
            `concept: ${conceptId}, accuracy: ${accuracy.toFixed(1)}%`
        );
    }
}

// ============================================================================
// Learning Edge Logic
// ============================================================================

function handleCorrectAnswer(
    conceptNodeId: string,
    accuracy: number,
    perf: ConceptPerformance
): void {
    const store = useGraphStore.getState();

    // Check if weakness edge exists and reduce it
    const existingEdges = store.getEdgesForNode(CURRENT_USER_NODE_ID, "out");
    const weaknessEdge = existingEdges.find(
        (e) =>
            e.targetId === conceptNodeId &&
            e.relationType === (GraphEdgeType.WEAKNESS as string)
    );

    if (weaknessEdge) {
        const newWeight = weaknessEdge.weight - WEAKNESS_IMPROVEMENT_REDUCTION;
        if (newWeight <= WEAKNESS_REMOVAL_THRESHOLD) {
            // Remove weakness entirely
            store.removeEdge(weaknessEdge.id);
            if (process.env.NODE_ENV === "development") {
                console.debug(`[LearningHandlers] Removed weakness edge for ${conceptNodeId}`);
            }
        } else {
            // Reduce weakness weight
            updateEdgeWeight(store, weaknessEdge.id, -WEAKNESS_IMPROVEMENT_REDUCTION);
        }
    }

    // Check if mastery threshold is met
    if (
        accuracy >= MASTERY_ACCURACY_THRESHOLD &&
        perf.totalCount >= MASTERY_MIN_ATTEMPTS
    ) {
        createOrUpdateMasteryEdge(conceptNodeId);
    }
}

function handleWrongAnswer(
    conceptNodeId: string,
    _accuracy: number,
    _perf: ConceptPerformance
): void {
    const store = useGraphStore.getState();

    // Check if weakness edge exists
    const existingEdges = store.getEdgesForNode(CURRENT_USER_NODE_ID, "out");
    const weaknessEdge = existingEdges.find(
        (e) =>
            e.targetId === conceptNodeId &&
            e.relationType === (GraphEdgeType.WEAKNESS as string)
    );

    if (weaknessEdge) {
        // Increase weakness weight
        const newWeight = Math.min(
            weaknessEdge.weight + WEAKNESS_WEIGHT_INCREMENT,
            WEAKNESS_WEIGHT_MAX
        );
        updateEdgeWeight(store, weaknessEdge.id, WEAKNESS_WEIGHT_INCREMENT);

        if (process.env.NODE_ENV === "development") {
            console.debug(
                `[LearningHandlers] Increased weakness for ${conceptNodeId}: ${newWeight.toFixed(2)}`
            );
        }
    } else {
        // Create new weakness edge
        store.addEdge(
            CURRENT_USER_NODE_ID,
            conceptNodeId,
            GraphEdgeType.WEAKNESS,
            WEAKNESS_INITIAL_WEIGHT,
            {
                createdAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
            }
        );

        if (process.env.NODE_ENV === "development") {
            console.debug(`[LearningHandlers] Created weakness edge for ${conceptNodeId}`);
        }
    }

    // Remove mastery edge if it exists (user regressed)
    const masteryEdge = existingEdges.find(
        (e) =>
            e.targetId === conceptNodeId &&
            e.relationType === (GraphEdgeType.MASTERY as string)
    );

    if (masteryEdge) {
        store.removeEdge(masteryEdge.id);
        if (process.env.NODE_ENV === "development") {
            console.debug(`[LearningHandlers] Removed mastery edge for ${conceptNodeId} (regression)`);
        }
    }
}

function createOrUpdateMasteryEdge(conceptNodeId: string): void {
    const store = useGraphStore.getState();

    // Check if mastery edge already exists
    const existingEdges = store.getEdgesForNode(CURRENT_USER_NODE_ID, "out");
    const masteryEdge = existingEdges.find(
        (e) =>
            e.targetId === conceptNodeId &&
            e.relationType === (GraphEdgeType.MASTERY as string)
    );

    if (!masteryEdge) {
        store.addEdge(
            CURRENT_USER_NODE_ID,
            conceptNodeId,
            GraphEdgeType.MASTERY,
            1.0,
            {
                achievedAt: new Date().toISOString(),
            }
        );

        if (process.env.NODE_ENV === "development") {
            console.debug(`[LearningHandlers] Created mastery edge for ${conceptNodeId}`);
        }
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function ensureUserNode(): void {
    const store = useGraphStore.getState();

    if (!store.getNode(CURRENT_USER_NODE_ID)) {
        // Create a placeholder user node
        // In a real app, this would be linked to the authenticated user
        store.addNode(
            { type: "user" as any, id: "current" },
            "Current User",
            { isSystemNode: true }
        );
    }
}

function updateEdgeWeight(
    store: ReturnType<typeof useGraphStore.getState>,
    edgeId: string,
    delta: number
): void {
    // Since we can't directly update edge weight,
    // we need to access the store's internal state
    // This is a workaround - ideally we'd add updateEdgeWeight to the store
    const edges = store.edges;
    const edge = edges.get(edgeId);
    if (edge) {
        const newWeight = Math.max(0, Math.min(edge.weight + delta, WEAKNESS_WEIGHT_MAX));
        // Mutate directly (works with immer)
        edge.weight = newWeight;
        edge.metadata.lastUpdatedAt = new Date().toISOString();
    }
}

// ============================================================================
// Decay Function (Call periodically)
// ============================================================================

/**
 * Apply decay to weakness edges.
 * Call this on app startup or periodically to fade old weaknesses.
 */
export function applyWeaknessDecay(daysSinceLastDecay: number = 1): void {
    const store = useGraphStore.getState();
    const decayRate = 0.05 * daysSinceLastDecay; // 5% per day

    const userEdges = store.getEdgesForNode(CURRENT_USER_NODE_ID, "out");
    const weaknessEdges = userEdges.filter(
        (e) => e.relationType === (GraphEdgeType.WEAKNESS as string)
    );

    for (const edge of weaknessEdges) {
        const newWeight = edge.weight * (1 - decayRate);

        if (newWeight <= WEAKNESS_REMOVAL_THRESHOLD) {
            store.removeEdge(edge.id);
        } else {
            updateEdgeWeight(store, edge.id, -edge.weight * decayRate);
        }
    }

    if (process.env.NODE_ENV === "development" && weaknessEdges.length > 0) {
        console.debug(
            `[LearningHandlers] Applied decay to ${weaknessEdges.length} weakness edges`
        );
    }
}
