/**
 * Shared Events - React Integration
 *
 * React hooks for subscribing to the EventBus.
 * This is the ONLY file in shared/events that depends on React.
 */

import { useEffect, useRef, useCallback } from "react";
import { EventBus, type EventHandler } from "./EventBus";
import type { EventEnvelope } from "./EventEnvelope";

/**
 * Subscribe to events matching a pattern.
 * Automatically cleans up on unmount.
 *
 * @param pattern - Event type pattern (supports wildcards)
 * @param handler - Callback when event matches
 * @param enabled - Optional flag to enable/disable subscription
 *
 * @example
 * useSubscription("note.*", (event) => {
 *   console.log("Note event:", event);
 * });
 *
 * @example
 * useSubscription("*.created", (event) => {
 *   console.log("Something was created:", event.entity);
 * });
 */
export function useSubscription<T = unknown>(
    pattern: string,
    handler: EventHandler<T>,
    enabled = true
): void {
    // Stable handler reference
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled) return;

        const unsubscribe = EventBus.subscribe<T>(pattern, (event) => {
            handlerRef.current(event);
        });

        return unsubscribe;
    }, [pattern, enabled]);
}

/**
 * Subscribe to a single event then auto-unsubscribe.
 * Useful for waiting for a specific response.
 */
export function useOnce<T = unknown>(
    pattern: string,
    handler: EventHandler<T>,
    enabled = true
): void {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled) return;

        const unsubscribe = EventBus.once<T>(pattern, (event) => {
            handlerRef.current(event);
        });

        return unsubscribe;
    }, [pattern, enabled]);
}

/**
 * Get a stable emit function.
 * Useful when you need to emit from callbacks.
 */
export function useEmit(): (event: EventEnvelope) => void {
    return useCallback((event: EventEnvelope) => {
        EventBus.emit(event);
    }, []);
}
