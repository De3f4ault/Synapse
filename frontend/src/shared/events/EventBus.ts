/**
 * Shared Events - Event Bus
 *
 * INVARIANT: Pure TypeScript - no React, no Zustand.
 * INVARIANT: Singleton pattern for app-wide event distribution.
 * INVARIANT: Side-effect minimal - only pub/sub mechanics.
 *
 * This is the central nervous system for cross-module communication.
 * Graph, Analytics, and future workers consume from here.
 */

import type { EventEnvelope } from "./EventEnvelope";
import { matchesEventType } from "./EventEnvelope";

// ============================================================================
// Types
// ============================================================================

export type EventHandler<T = unknown> = (event: EventEnvelope<T>) => void;

interface Subscription {
    pattern: string;
    handler: EventHandler<any>;
    once: boolean;
}

// ============================================================================
// Event Bus Implementation
// ============================================================================

class EventBusImpl {
    private subscriptions: Set<Subscription> = new Set();
    private eventHistory: EventEnvelope[] = [];
    private readonly maxHistorySize = 100;

    /**
     * Subscribe to events matching a pattern.
     * @param pattern - Event type pattern (supports wildcards: "note.*", "*.created")
     * @param handler - Callback when event matches
     * @returns Unsubscribe function
     */
    subscribe<T = unknown>(pattern: string, handler: EventHandler<T>): () => void {
        const subscription: Subscription = { pattern, handler, once: false };
        this.subscriptions.add(subscription);

        return () => {
            this.subscriptions.delete(subscription);
        };
    }

    /**
     * Subscribe to a single event then auto-unsubscribe.
     */
    once<T = unknown>(pattern: string, handler: EventHandler<T>): () => void {
        const subscription: Subscription = { pattern, handler, once: true };
        this.subscriptions.add(subscription);

        return () => {
            this.subscriptions.delete(subscription);
        };
    }

    /**
     * Emit an event to all matching subscribers.
     */
    emit(event: EventEnvelope): void {
        // Store in history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }

        // Notify subscribers
        const toRemove: Subscription[] = [];

        this.subscriptions.forEach((subscription) => {
            if (matchesEventType(event, subscription.pattern)) {
                try {
                    subscription.handler(event);
                } catch (error) {
                    console.error(
                        `[EventBus] Handler error for pattern "${subscription.pattern}":`,
                        error
                    );
                }

                if (subscription.once) {
                    toRemove.push(subscription);
                }
            }
        });

        // Clean up one-time subscriptions
        toRemove.forEach((sub) => this.subscriptions.delete(sub));

        // Dev logging
        if (process.env.NODE_ENV === "development") {
            console.debug(`[EventBus] Emitted: ${event.type}`, event);
        }
    }

    /**
     * Get recent events (for debugging/replay).
     */
    getHistory(): readonly EventEnvelope[] {
        return [...this.eventHistory];
    }

    /**
     * Clear all subscriptions (for testing).
     */
    clear(): void {
        this.subscriptions.clear();
        this.eventHistory = [];
    }

    /**
     * Get subscription count (for debugging).
     */
    get subscriberCount(): number {
        return this.subscriptions.size;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * The global event bus instance.
 * Use this for all cross-module event communication.
 */
export const EventBus = new EventBusImpl();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Shorthand for EventBus.subscribe
 */
export function onEvent<T = unknown>(
    pattern: string,
    handler: EventHandler<T>
): () => void {
    return EventBus.subscribe(pattern, handler);
}

/**
 * Shorthand for EventBus.emit
 */
export function emitEvent(event: EventEnvelope): void {
    EventBus.emit(event);
}
