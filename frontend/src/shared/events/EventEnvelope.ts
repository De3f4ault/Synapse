/**
 * Shared Events - Event Envelope
 *
 * INVARIANT: This is the ONE canonical event shape for the entire system.
 * INVARIANT: Pure TypeScript - no React, no Zustand, no module imports.
 *
 * All domain modules emit events conforming to this envelope.
 * Consumers (Graph, Analytics, Sync) subscribe without coupling to domains.
 */

import type { EntityRef } from "../entities/EntityRef";

// ============================================================================
// Event Envelope (The One True Shape)
// ============================================================================

/**
 * Every event in the system wraps in this envelope.
 * This is the contract between modules.
 */
export interface EventEnvelope<T = unknown> {
    /** Unique event ID for deduplication/tracing */
    readonly id: string;

    /**
     * Dot-namespaced event type.
     * Pattern: `{domain}.{action}` e.g., "note.created", "quiz.completed"
     */
    readonly type: string;

    /** The entity this event concerns (optional for system-level events) */
    readonly entity?: EntityRef;

    /** Domain-specific payload */
    readonly payload: T;

    /** ISO timestamp of when the event occurred */
    readonly timestamp: string;

    /** Metadata for tracing, analytics */
    readonly meta?: EventMeta;
}

/**
 * Optional metadata attached to events.
 */
export interface EventMeta {
    /** Correlation ID for tracing related events */
    correlationId?: string;

    /** User who triggered the event (if applicable) */
    userId?: number;

    /** Session ID for grouping user actions */
    sessionId?: string;

    /** Source module that emitted the event */
    source?: string;
}

// ============================================================================
// Event Factory
// ============================================================================

let eventCounter = 0;

/**
 * Create a properly shaped event envelope.
 * This is the ONLY way to create events.
 */
export function createEvent<T>(
    type: string,
    payload: T,
    entity?: EntityRef,
    meta?: EventMeta
): EventEnvelope<T> {
    return {
        id: `evt_${Date.now()}_${++eventCounter}`,
        type,
        entity,
        payload,
        timestamp: new Date().toISOString(),
        meta,
    };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an event matches a specific type pattern.
 * Supports wildcards: "note.*" matches "note.created", "note.deleted", etc.
 */
export function matchesEventType(event: EventEnvelope, pattern: string): boolean {
    if (pattern === "*") return true;

    if (pattern.endsWith(".*")) {
        const prefix = pattern.slice(0, -2);
        return event.type.startsWith(prefix + ".");
    }

    if (pattern.startsWith("*.")) {
        const suffix = pattern.slice(2);
        return event.type.endsWith("." + suffix);
    }

    return event.type === pattern;
}

// ============================================================================
// Known Event Type Constants (for type safety)
// ============================================================================

export const EventTypes = {
    // Notes
    NOTE_CREATED: "note.created",
    NOTE_UPDATED: "note.updated",
    NOTE_DELETED: "note.deleted",
    NOTE_VIEWED: "note.viewed",
    NOTE_RESTORED: "note.restored",

    // Quizzes
    QUIZ_STARTED: "quiz.started",
    QUIZ_COMPLETED: "quiz.completed",
    QUIZ_RESUMED: "quiz.resumed",
    QUIZ_ABANDONED: "quiz.abandoned",
    QUIZ_QUESTION_ANSWERED: "quiz.question.answered",

    // Documents
    DOCUMENT_UPLOADED: "document.uploaded",
    DOCUMENT_PROCESSED: "document.processed",
    DOCUMENT_DELETED: "document.deleted",
    DOCUMENT_VIEWED: "document.viewed",

    // Flashcards
    DECK_CREATED: "deck.created",
    DECK_STUDIED: "deck.studied",
    CARD_REVIEWED: "card.reviewed",

    // Learning Intelligence
    LEARNING_STRENGTHENED: "learning.strengthened",
    LEARNING_WEAKENED: "learning.weakened",
    LEARNING_FIRST_REVIEW: "learning.first_review",

    // System
    SESSION_STARTED: "session.started",
    SESSION_ENDED: "session.ended",
} as const;

export type KnownEventType = (typeof EventTypes)[keyof typeof EventTypes];
