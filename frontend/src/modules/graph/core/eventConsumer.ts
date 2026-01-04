/**
 * Graph Module - Event Consumer
 *
 * ARCHITECTURE (Post-Refactor):
 * - Subscribes ONLY to shared/events EventBus
 * - Imports ZERO domain module code
 * - Uses only shared contracts: EventEnvelope, EntityRef, EventTypes
 *
 * This is a PASSIVE consumer - it listens but never emits.
 * All graph mutations happen through explicit actions.
 * Events are used for eventual consistency.
 */

import {
    EventBus,
    type EventEnvelope,
    EventTypes,
    matchesEventType,
} from "@/shared/events";
import { type EntityRef, entityKey } from "@/shared/entities";

// ============================================================================
// Graph Event Context
// ============================================================================

/**
 * Normalized context for graph operations.
 * Decoupled from any specific domain module.
 */
export interface GraphEventContext {
    /** The entity this event concerns */
    entity: EntityRef | undefined;

    /** ISO timestamp */
    timestamp: string;

    /** Original event type for debugging */
    originalType: string;

    /** Full payload for domain-specific processing */
    payload: unknown;
}

// ============================================================================
// Graph Event Types (What Graph cares about)
// ============================================================================

export type GraphEventType =
    | "entity:created"
    | "entity:updated"
    | "entity:deleted"
    | "entity:accessed"
    | "entity:completed"
    | "entity:ready"
    | "mastery:updated";

// ============================================================================
// Internal Handler Registry
// ============================================================================

type GraphEventHandler = (context: GraphEventContext) => void;

const handlers: Map<GraphEventType, Set<GraphEventHandler>> = new Map();

/**
 * Subscribe to graph-level events.
 * @returns Unsubscribe function
 */
export function onGraphEvent(
    eventType: GraphEventType,
    handler: GraphEventHandler
): () => void {
    if (!handlers.has(eventType)) {
        handlers.set(eventType, new Set());
    }
    handlers.get(eventType)!.add(handler);
    return () => handlers.get(eventType)?.delete(handler);
}

function notifyHandlers(eventType: GraphEventType, context: GraphEventContext): void {
    const eventHandlers = handlers.get(eventType);
    if (eventHandlers) {
        eventHandlers.forEach((handler) => {
            try {
                handler(context);
            } catch (error) {
                console.error(`[GraphEventConsumer] Handler error for ${eventType}:`, error);
            }
        });
    }
}

// ============================================================================
// Event → Graph Action Mapping
// ============================================================================

/**
 * Map domain events to graph-level actions.
 * This is where we define what domain events mean to the graph.
 */
function mapToGraphEvent(envelope: EventEnvelope): GraphEventType | null {
    // Created events
    if (
        matchesEventType(envelope, EventTypes.NOTE_CREATED) ||
        matchesEventType(envelope, EventTypes.DOCUMENT_UPLOADED) ||
        matchesEventType(envelope, EventTypes.DECK_CREATED)
    ) {
        return "entity:created";
    }

    // Updated events
    if (matchesEventType(envelope, EventTypes.NOTE_UPDATED)) {
        return "entity:updated";
    }

    // Deleted events
    if (
        matchesEventType(envelope, EventTypes.NOTE_DELETED) ||
        matchesEventType(envelope, EventTypes.DOCUMENT_DELETED)
    ) {
        return "entity:deleted";
    }

    // Accessed events (views, starts, resumes)
    if (
        matchesEventType(envelope, EventTypes.NOTE_VIEWED) ||
        matchesEventType(envelope, EventTypes.DOCUMENT_VIEWED) ||
        matchesEventType(envelope, EventTypes.QUIZ_STARTED) ||
        matchesEventType(envelope, EventTypes.QUIZ_RESUMED)
    ) {
        return "entity:accessed";
    }

    // Completed events
    if (matchesEventType(envelope, EventTypes.QUIZ_COMPLETED)) {
        return "entity:completed";
    }

    // Ready events (processing finished)
    if (matchesEventType(envelope, EventTypes.DOCUMENT_PROCESSED)) {
        return "entity:ready";
    }

    // Card reviewed → mastery update
    if (matchesEventType(envelope, EventTypes.CARD_REVIEWED)) {
        return "mastery:updated";
    }

    return null;
}

// ============================================================================
// Unified Event Handler
// ============================================================================

function handleEvent(envelope: EventEnvelope): void {
    const graphEventType = mapToGraphEvent(envelope);

    if (!graphEventType) {
        // Event not relevant to graph
        return;
    }

    const context: GraphEventContext = {
        entity: envelope.entity,
        timestamp: envelope.timestamp,
        originalType: envelope.type,
        payload: envelope.payload,
    };

    notifyHandlers(graphEventType, context);

    // Special case: quiz completion also triggers mastery update
    if (graphEventType === "entity:completed") {
        notifyHandlers("mastery:updated", context);
    }

    // Development logging
    if (process.env.NODE_ENV === "development") {
        const entityInfo = envelope.entity ? entityKey(envelope.entity) : "no-entity";
        console.debug(
            `[GraphEventConsumer] ${envelope.type} → ${graphEventType} (${entityInfo})`
        );
    }
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;
let unsubscribe: (() => void) | null = null;

/**
 * Initialize the graph event consumer.
 * Call once at app startup.
 *
 * Subscribes to ALL events via shared EventBus using wildcard pattern.
 */
export function initGraphEventConsumer(): () => void {
    if (initialized) {
        console.warn("[GraphEventConsumer] Already initialized");
        return () => { };
    }

    initialized = true;

    // Subscribe to ALL domain events using wildcard
    // The handleEvent function filters to graph-relevant ones
    unsubscribe = EventBus.subscribe("*", handleEvent);

    if (process.env.NODE_ENV === "development") {
        console.log(
            "[GraphEventConsumer] Initialized - listening to shared EventBus (pattern: *)"
        );
    }

    // Return cleanup function
    return () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        initialized = false;
    };
}

/**
 * Check if the consumer is initialized.
 */
export function isGraphEventConsumerInitialized(): boolean {
    return initialized;
}

