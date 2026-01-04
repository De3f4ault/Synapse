/**
 * Notes Module - Domain Events
 *
 * ARCHITECTURE:
 * - Payload types are OWNED by this module (domain semantics)
 * - Emission/subscription is DELEGATED to shared/events (mechanics)
 *
 * This module defines WHAT note events mean.
 * Shared defines HOW events flow.
 */

import {
    EventBus,
    createEvent,
    type EventEnvelope,
    EventTypes,
} from "@/shared/events";
import { noteRef } from "@/shared/entities";

// ============================================================================
// Event Payload Types (Module-owned)
// ============================================================================

/** Payload for note.created */
export interface NoteCreatedPayload {
    noteId: number;
    parentId: number | null;
}

/** Payload for note.updated */
export interface NoteUpdatedPayload {
    noteId: number;
    fields: ("title" | "content" | "format" | "tags")[];
}

/** Payload for note.deleted */
export interface NoteDeletedPayload {
    noteId: number;
}

/** Payload for note.restored */
export interface NoteRestoredPayload {
    noteId: number;
    versionNumber: number;
}

/** Payload for note.viewed */
export interface NoteViewedPayload {
    noteId: number;
}

/** Payload for note.searched */
export interface NoteSearchedPayload {
    query: string;
    resultCount: number;
}

// ============================================================================
// Legacy Type Aliases (for backward compatibility during migration)
// ============================================================================

/** @deprecated Use NoteCreatedPayload with EventEnvelope */
export interface NoteCreatedEvent {
    type: "note.created";
    noteId: number;
    parentId: number | null;
    timestamp: Date;
}

/** @deprecated Use NoteUpdatedPayload with EventEnvelope */
export interface NoteUpdatedEvent {
    type: "note.updated";
    noteId: number;
    fields: ("title" | "content" | "format" | "tags")[];
    timestamp: Date;
}

/** @deprecated Use NoteDeletedPayload with EventEnvelope */
export interface NoteDeletedEvent {
    type: "note.deleted";
    noteId: number;
    timestamp: Date;
}

/** @deprecated Use NoteRestoredPayload with EventEnvelope */
export interface NoteRestoredEvent {
    type: "note.restored";
    noteId: number;
    versionNumber: number;
    timestamp: Date;
}

/** @deprecated Use NoteViewedPayload with EventEnvelope */
export interface NoteViewedEvent {
    type: "note.viewed";
    noteId: number;
    timestamp: Date;
}

/** @deprecated Use NoteSearchedPayload with EventEnvelope */
export interface NoteSearchedEvent {
    type: "note.searched";
    query: string;
    resultCount: number;
    timestamp: Date;
}

/** @deprecated Use EventEnvelope with specific payload types */
export type NoteEvent =
    | NoteCreatedEvent
    | NoteUpdatedEvent
    | NoteDeletedEvent
    | NoteRestoredEvent
    | NoteViewedEvent
    | NoteSearchedEvent;

// ============================================================================
// Subscription (Delegated to Shared EventBus)
// ============================================================================

/**
 * Subscribe to all note events.
 * @returns Unsubscribe function
 *
 * @deprecated For new code, use:
 * ```
 * import { useSubscription } from "@/shared/events";
 * useSubscription("note.*", handler);
 * ```
 */
export function subscribeToNoteEvents(
    handler: (event: NoteEvent) => void
): () => void {
    // Bridge: Convert new EventEnvelope to legacy NoteEvent format
    return EventBus.subscribe("note.*", (envelope: EventEnvelope) => {
        const legacyEvent = toLegacyEvent(envelope);
        if (legacyEvent) {
            handler(legacyEvent);
        }
    });
}

/**
 * Convert EventEnvelope to legacy NoteEvent format.
 * This is a temporary bridge during migration.
 */
function toLegacyEvent(envelope: EventEnvelope): NoteEvent | null {
    const timestamp = new Date(envelope.timestamp);
    const payload = envelope.payload as Record<string, unknown>;

    switch (envelope.type) {
        case EventTypes.NOTE_CREATED:
            return {
                type: "note.created",
                noteId: payload.noteId as number,
                parentId: payload.parentId as number | null,
                timestamp,
            };
        case EventTypes.NOTE_UPDATED:
            return {
                type: "note.updated",
                noteId: payload.noteId as number,
                fields: payload.fields as NoteUpdatedEvent["fields"],
                timestamp,
            };
        case EventTypes.NOTE_DELETED:
            return {
                type: "note.deleted",
                noteId: payload.noteId as number,
                timestamp,
            };
        case EventTypes.NOTE_RESTORED:
            return {
                type: "note.restored",
                noteId: payload.noteId as number,
                versionNumber: payload.versionNumber as number,
                timestamp,
            };
        case EventTypes.NOTE_VIEWED:
            return {
                type: "note.viewed",
                noteId: payload.noteId as number,
                timestamp,
            };
        case "note.searched":
            return {
                type: "note.searched",
                query: payload.query as string,
                resultCount: payload.resultCount as number,
                timestamp,
            };
        default:
            return null;
    }
}

// ============================================================================
// Emission (Delegated to Shared EventBus)
// ============================================================================

/**
 * Emit a note event.
 *
 * @deprecated For new code, use:
 * ```
 * import { emitEvent, createEvent, noteRef } from "@/shared";
 * emitEvent(createEvent(EventTypes.NOTE_CREATED, payload, noteRef(id)));
 * ```
 */
export function emitNoteEvent(event: NoteEvent): void {
    // Bridge: Convert legacy NoteEvent to EventEnvelope and emit
    const envelope = fromLegacyEvent(event);
    EventBus.emit(envelope);
}

/**
 * Convert legacy NoteEvent to EventEnvelope.
 */
function fromLegacyEvent(event: NoteEvent): EventEnvelope {
    switch (event.type) {
        case "note.created":
            return createEvent(
                EventTypes.NOTE_CREATED,
                { noteId: event.noteId, parentId: event.parentId },
                noteRef(event.noteId)
            );
        case "note.updated":
            return createEvent(
                EventTypes.NOTE_UPDATED,
                { noteId: event.noteId, fields: event.fields },
                noteRef(event.noteId)
            );
        case "note.deleted":
            return createEvent(
                EventTypes.NOTE_DELETED,
                { noteId: event.noteId },
                noteRef(event.noteId)
            );
        case "note.restored":
            return createEvent(
                EventTypes.NOTE_RESTORED,
                { noteId: event.noteId, versionNumber: event.versionNumber },
                noteRef(event.noteId)
            );
        case "note.viewed":
            return createEvent(
                EventTypes.NOTE_VIEWED,
                { noteId: event.noteId },
                noteRef(event.noteId)
            );
        case "note.searched":
            return createEvent(
                "note.searched",
                { query: event.query, resultCount: event.resultCount }
                // No entity for search events
            );
    }
}

// ============================================================================
// Event Factories (Keep for backward compatibility)
// ============================================================================

export function noteCreated(
    noteId: number,
    parentId: number | null
): NoteCreatedEvent {
    return { type: "note.created", noteId, parentId, timestamp: new Date() };
}

export function noteUpdated(
    noteId: number,
    fields: NoteUpdatedEvent["fields"]
): NoteUpdatedEvent {
    return { type: "note.updated", noteId, fields, timestamp: new Date() };
}

export function noteDeleted(noteId: number): NoteDeletedEvent {
    return { type: "note.deleted", noteId, timestamp: new Date() };
}

export function noteRestored(
    noteId: number,
    versionNumber: number
): NoteRestoredEvent {
    return { type: "note.restored", noteId, versionNumber, timestamp: new Date() };
}

export function noteViewed(noteId: number): NoteViewedEvent {
    return { type: "note.viewed", noteId, timestamp: new Date() };
}

export function noteSearched(
    query: string,
    resultCount: number
): NoteSearchedEvent {
    return { type: "note.searched", query, resultCount, timestamp: new Date() };
}

// ============================================================================
// New API (Recommended for new code)
// ============================================================================

/**
 * Emit a note created event using the shared EventBus.
 */
export function emitNoteCreated(noteId: number, parentId: number | null): void {
    EventBus.emit(
        createEvent(
            EventTypes.NOTE_CREATED,
            { noteId, parentId } satisfies NoteCreatedPayload,
            noteRef(noteId)
        )
    );
}

/**
 * Emit a note updated event using the shared EventBus.
 */
export function emitNoteUpdated(
    noteId: number,
    fields: NoteUpdatedPayload["fields"]
): void {
    EventBus.emit(
        createEvent(
            EventTypes.NOTE_UPDATED,
            { noteId, fields } satisfies NoteUpdatedPayload,
            noteRef(noteId)
        )
    );
}

/**
 * Emit a note deleted event using the shared EventBus.
 */
export function emitNoteDeleted(noteId: number): void {
    EventBus.emit(
        createEvent(
            EventTypes.NOTE_DELETED,
            { noteId } satisfies NoteDeletedPayload,
            noteRef(noteId)
        )
    );
}

/**
 * Emit a note restored event using the shared EventBus.
 */
export function emitNoteRestored(noteId: number, versionNumber: number): void {
    EventBus.emit(
        createEvent(
            EventTypes.NOTE_RESTORED,
            { noteId, versionNumber } satisfies NoteRestoredPayload,
            noteRef(noteId)
        )
    );
}

/**
 * Emit a note viewed event using the shared EventBus.
 */
export function emitNoteViewed(noteId: number): void {
    EventBus.emit(
        createEvent(
            EventTypes.NOTE_VIEWED,
            { noteId } satisfies NoteViewedPayload,
            noteRef(noteId)
        )
    );
}

/**
 * Emit a note searched event using the shared EventBus.
 */
export function emitNoteSearched(query: string, resultCount: number): void {
    EventBus.emit(
        createEvent("note.searched", { query, resultCount } satisfies NoteSearchedPayload)
    );
}

