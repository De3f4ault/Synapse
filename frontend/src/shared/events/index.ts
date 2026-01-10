/**
 * Shared Events - Public API
 */

// Core types
export { type EventEnvelope, type EventMeta, type KnownEventType } from "./EventEnvelope";

// Factory & helpers
export { createEvent, matchesEventType, EventTypes } from "./EventEnvelope";

// Bus
export { EventBus, onEvent, emitEvent, type EventHandler } from "./EventBus";

// React integration
export { useSubscription, useOnce, useEmit } from "./useSubscription";
