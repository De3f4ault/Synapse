/**
 * Documents Module - Event System
 *
 * ARCHITECTURE:
 * - Payload types are OWNED by this module (domain semantics)
 * - Emission/subscription is DELEGATED to shared/events (mechanics)
 *
 * This module defines WHAT document events mean.
 * Shared defines HOW events flow.
 */

import {
    EventBus,
    createEvent,
    type EventEnvelope,
    EventTypes,
} from "@/shared/events";
import { documentRef } from "@/shared/entities";

// ============================================================================
// Event Types (Module-owned)
// ============================================================================

export type DocumentEventType =
    | "document_uploaded"
    | "document_processing_started"
    | "document_processing_completed"
    | "document_processing_failed"
    | "document_viewed"
    | "document_deleted"
    | "chunk_viewed"
    | "document_searched";

// ============================================================================
// Event Payloads (Module-owned)
// ============================================================================

/** Base payload fields */
interface BasePayload {
    documentId?: number;
}

/** Payload for document_uploaded */
export interface DocumentUploadedPayload extends BasePayload {
    filename: string;
    size: number;
}

/** Payload for document_processing_started */
export interface DocumentProcessingStartedPayload extends BasePayload { }

/** Payload for document_processing_completed */
export interface DocumentProcessingCompletedPayload extends BasePayload {
    chunkCount: number;
}

/** Payload for document_processing_failed */
export interface DocumentProcessingFailedPayload extends BasePayload {
    error: string;
}

/** Payload for document_viewed */
export interface DocumentViewedPayload extends BasePayload { }

/** Payload for document_deleted */
export interface DocumentDeletedPayload extends BasePayload { }

/** Payload for chunk_viewed */
export interface ChunkViewedPayload extends BasePayload {
    chunkId: number;
}

/** Payload for document_searched */
export interface DocumentSearchedPayload extends BasePayload {
    query: string;
    resultCount: number;
}

// ============================================================================
// Legacy Type (for backward compatibility)
// ============================================================================

/** @deprecated Use individual payload types with EventEnvelope */
export interface DocumentEventPayloads {
    document_uploaded: { timestamp: string } & DocumentUploadedPayload;
    document_processing_started: { timestamp: string } & DocumentProcessingStartedPayload;
    document_processing_completed: { timestamp: string } & DocumentProcessingCompletedPayload;
    document_processing_failed: { timestamp: string } & DocumentProcessingFailedPayload;
    document_viewed: { timestamp: string } & DocumentViewedPayload;
    document_deleted: { timestamp: string } & DocumentDeletedPayload;
    chunk_viewed: { timestamp: string } & ChunkViewedPayload;
    document_searched: { timestamp: string } & DocumentSearchedPayload;
}

// ============================================================================
// Subscription (Delegated to Shared EventBus)
// ============================================================================

/**
 * Subscribe to a document event.
 *
 * @deprecated For new code, use:
 * ```
 * import { useSubscription } from "@/shared/events";
 * useSubscription("document.*", handler);
 * ```
 */
export function onDocumentEvent<T extends DocumentEventType>(
    type: T,
    handler: (payload: DocumentEventPayloads[T]) => void
): () => void {
    const pattern = mapLegacyTypeToPattern(type);

    return EventBus.subscribe(pattern, (envelope: EventEnvelope) => {
        const legacyPayload = {
            ...(envelope.payload as Record<string, unknown>),
            timestamp: envelope.timestamp,
        } as DocumentEventPayloads[T];
        handler(legacyPayload);
    });
}

function mapLegacyTypeToPattern(type: DocumentEventType): string {
    switch (type) {
        case "document_uploaded":
            return EventTypes.DOCUMENT_UPLOADED;
        case "document_processing_completed":
            return EventTypes.DOCUMENT_PROCESSED;
        case "document_viewed":
            return EventTypes.DOCUMENT_VIEWED;
        case "document_deleted":
            return EventTypes.DOCUMENT_DELETED;
        default:
            return `document.${type.replace("document_", "").replace("_", ".")}`;
    }
}

// ============================================================================
// Emission (Delegated to Shared EventBus)
// ============================================================================

/**
 * Emit a document event.
 *
 * @deprecated For new code, use the specific emit functions below.
 */
export function emitDocumentEvent<T extends DocumentEventType>(
    type: T,
    payload: Omit<DocumentEventPayloads[T], "timestamp">
): void {
    const eventType = mapLegacyTypeToSharedEventType(type);
    const docId = (payload as BasePayload).documentId;

    EventBus.emit(
        createEvent(
            eventType,
            payload,
            docId ? documentRef(docId) : undefined
        )
    );
}

function mapLegacyTypeToSharedEventType(type: DocumentEventType): string {
    switch (type) {
        case "document_uploaded":
            return EventTypes.DOCUMENT_UPLOADED;
        case "document_processing_completed":
            return EventTypes.DOCUMENT_PROCESSED;
        case "document_viewed":
            return EventTypes.DOCUMENT_VIEWED;
        case "document_deleted":
            return EventTypes.DOCUMENT_DELETED;
        default:
            return `document.${type.replace("document_", "").replace("_", ".")}`;
    }
}

// ============================================================================
// New API (Recommended for new code)
// ============================================================================

/**
 * Emit a document uploaded event.
 */
export function emitDocumentUploaded(
    documentId: number,
    payload: DocumentUploadedPayload
): void {
    EventBus.emit(
        createEvent(EventTypes.DOCUMENT_UPLOADED, payload, documentRef(documentId))
    );
}

/**
 * Emit a document processing completed event.
 */
export function emitDocumentProcessed(
    documentId: number,
    payload: DocumentProcessingCompletedPayload
): void {
    EventBus.emit(
        createEvent(EventTypes.DOCUMENT_PROCESSED, payload, documentRef(documentId))
    );
}

/**
 * Emit a document viewed event.
 */
export function emitDocumentViewed(documentId: number): void {
    EventBus.emit(
        createEvent(
            EventTypes.DOCUMENT_VIEWED,
            { documentId } satisfies DocumentViewedPayload,
            documentRef(documentId)
        )
    );
}

/**
 * Emit a document deleted event.
 */
export function emitDocumentDeleted(documentId: number): void {
    EventBus.emit(
        createEvent(
            EventTypes.DOCUMENT_DELETED,
            { documentId } satisfies DocumentDeletedPayload,
            documentRef(documentId)
        )
    );
}

/**
 * Emit a document searched event.
 */
export function emitDocumentSearched(payload: DocumentSearchedPayload): void {
    EventBus.emit(
        createEvent("document.searched", payload)
    );
}

