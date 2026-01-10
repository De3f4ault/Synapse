/**
 * Quiz Module - Event System
 *
 * ARCHITECTURE:
 * - Payload types are OWNED by this module (domain semantics)
 * - Emission/subscription is DELEGATED to shared/events (mechanics)
 *
 * This module defines WHAT quiz events mean.
 * Shared defines HOW events flow.
 */

import {
    EventBus,
    createEvent,
    type EventEnvelope,
    EventTypes,
} from "@/shared/events";
import { quizRef } from "@/shared/entities";

// ============================================================================
// Event Types (Module-owned)
// ============================================================================

/**
 * All quiz-related event types.
 */
export type QuizEventType =
    | "quiz_started"
    | "quiz_resumed"
    | "question_answered"
    | "question_skipped"
    | "quiz_submitted"
    | "quiz_completed"
    | "quiz_expired"
    | "quiz_abandoned"
    | "insight_requested"
    | "insight_received";

// ============================================================================
// Event Payloads (Module-owned)
// ============================================================================

/** Base payload fields */
interface BasePayload {
    attemptId?: number;
    quizId?: number;
}

/** Payload for quiz_started */
export interface QuizStartedPayload extends BasePayload {
    questionCount: number;
}

/** Payload for quiz_resumed */
export interface QuizResumedPayload extends BasePayload {
    resumedFromIndex: number;
}

/** Payload for question_answered */
export interface QuestionAnsweredPayload extends BasePayload {
    questionId: number;
    isCorrect: boolean;
    timeSpent: number;
}

/** Payload for question_skipped */
export interface QuestionSkippedPayload extends BasePayload {
    questionId: number;
}

/** Payload for quiz_submitted */
export interface QuizSubmittedPayload extends BasePayload {
    answeredCount: number;
}

/** Payload for quiz_completed */
export interface QuizCompletedPayload extends BasePayload {
    score: number;
    percentage: number;
    duration: number;
}

/** Payload for quiz_expired */
export interface QuizExpiredPayload extends BasePayload {
    answeredCount: number;
}

/** Payload for quiz_abandoned */
export interface QuizAbandonedPayload extends BasePayload {
    answeredCount: number;
}

/** Payload for insight_requested */
export interface InsightRequestedPayload extends BasePayload { }

/** Payload for insight_received */
export interface InsightReceivedPayload extends BasePayload {
    hasWeakAreas: boolean;
}

// ============================================================================
// Legacy Type (for backward compatibility)
// ============================================================================

/** @deprecated Use individual payload types with EventEnvelope */
export interface QuizEventPayloads {
    quiz_started: { timestamp: string } & QuizStartedPayload;
    quiz_resumed: { timestamp: string } & QuizResumedPayload;
    question_answered: { timestamp: string } & QuestionAnsweredPayload;
    question_skipped: { timestamp: string } & QuestionSkippedPayload;
    quiz_submitted: { timestamp: string } & QuizSubmittedPayload;
    quiz_completed: { timestamp: string } & QuizCompletedPayload;
    quiz_expired: { timestamp: string } & QuizExpiredPayload;
    quiz_abandoned: { timestamp: string } & QuizAbandonedPayload;
    insight_requested: { timestamp: string } & InsightRequestedPayload;
    insight_received: { timestamp: string } & InsightReceivedPayload;
}

// ============================================================================
// Subscription (Delegated to Shared EventBus)
// ============================================================================

/**
 * Subscribe to a quiz event.
 *
 * @deprecated For new code, use:
 * ```
 * import { useSubscription } from "@/shared/events";
 * useSubscription("quiz.*", handler);
 * ```
 */
export function onQuizEvent<T extends QuizEventType>(
    type: T,
    handler: (payload: QuizEventPayloads[T]) => void
): () => void {
    // Map legacy event type to shared event type pattern
    const pattern = mapLegacyTypeToPattern(type);

    return EventBus.subscribe(pattern, (envelope: EventEnvelope) => {
        // Convert to legacy format
        const legacyPayload = {
            ...(envelope.payload as Record<string, unknown>),
            timestamp: envelope.timestamp,
        } as QuizEventPayloads[T];
        handler(legacyPayload);
    });
}

function mapLegacyTypeToPattern(type: QuizEventType): string {
    switch (type) {
        case "quiz_started":
            return EventTypes.QUIZ_STARTED;
        case "quiz_completed":
            return EventTypes.QUIZ_COMPLETED;
        case "quiz_resumed":
            return EventTypes.QUIZ_RESUMED;
        case "quiz_abandoned":
            return EventTypes.QUIZ_ABANDONED;
        default:
            // For other events, use quiz.* pattern
            return `quiz.${type.replace("quiz_", "").replace("_", ".")}`;
    }
}

// ============================================================================
// Emission (Delegated to Shared EventBus)
// ============================================================================

/**
 * Emit a quiz event.
 *
 * @deprecated For new code, use the specific emit functions below.
 */
export function emitQuizEvent<T extends QuizEventType>(
    type: T,
    payload: Omit<QuizEventPayloads[T], "timestamp">
): void {
    const eventType = mapLegacyTypeToSharedEventType(type);
    const quizId = (payload as BasePayload).quizId;

    EventBus.emit(
        createEvent(
            eventType,
            payload,
            quizId ? quizRef(quizId) : undefined
        )
    );
}

function mapLegacyTypeToSharedEventType(type: QuizEventType): string {
    switch (type) {
        case "quiz_started":
            return EventTypes.QUIZ_STARTED;
        case "quiz_completed":
            return EventTypes.QUIZ_COMPLETED;
        case "quiz_resumed":
            return EventTypes.QUIZ_RESUMED;
        case "quiz_abandoned":
            return EventTypes.QUIZ_ABANDONED;
        default:
            return `quiz.${type.replace("quiz_", "").replace("question_", "question.")}`;
    }
}

// ============================================================================
// New API (Recommended for new code)
// ============================================================================

/**
 * Emit a quiz started event.
 */
export function emitQuizStarted(quizId: number, payload: QuizStartedPayload): void {
    EventBus.emit(
        createEvent(EventTypes.QUIZ_STARTED, payload, quizRef(quizId))
    );
}

/**
 * Emit a quiz resumed event.
 */
export function emitQuizResumed(quizId: number, payload: QuizResumedPayload): void {
    EventBus.emit(
        createEvent(EventTypes.QUIZ_RESUMED, payload, quizRef(quizId))
    );
}

/**
 * Emit a quiz completed event.
 */
export function emitQuizCompleted(quizId: number, payload: QuizCompletedPayload): void {
    EventBus.emit(
        createEvent(EventTypes.QUIZ_COMPLETED, payload, quizRef(quizId))
    );
}

/**
 * Emit a quiz abandoned event.
 */
export function emitQuizAbandoned(quizId: number, payload: QuizAbandonedPayload): void {
    EventBus.emit(
        createEvent(EventTypes.QUIZ_ABANDONED, payload, quizRef(quizId))
    );
}

/**
 * Emit a question answered event.
 */
export function emitQuestionAnswered(quizId: number, payload: QuestionAnsweredPayload): void {
    EventBus.emit(
        createEvent("quiz.question.answered", payload, quizRef(quizId))
    );
}

/**
 * Emit a question skipped event.
 */
export function emitQuestionSkipped(quizId: number, payload: QuestionSkippedPayload): void {
    EventBus.emit(
        createEvent("quiz.question.skipped", payload, quizRef(quizId))
    );
}

