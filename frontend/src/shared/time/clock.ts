/**
 * Shared Time - Clock Abstraction
 *
 * INVARIANT: All time operations go through this module.
 * INVARIANT: Mockable for testing and offline scenarios.
 *
 * This prevents non-reproducible bugs in:
 * - Resume logic
 * - Analytics windows
 * - Sync timing
 */

// ============================================================================
// Clock Interface
// ============================================================================

export interface Clock {
    /** Get current timestamp as ISO string */
    now(): string;

    /** Get current timestamp as Date */
    nowDate(): Date;

    /** Get current timestamp as Unix milliseconds */
    nowMs(): number;
}

// ============================================================================
// Real Clock (Default)
// ============================================================================

const realClock: Clock = {
    now: () => new Date().toISOString(),
    nowDate: () => new Date(),
    nowMs: () => Date.now(),
};

// ============================================================================
// Mock Clock (For Testing)
// ============================================================================

export function createMockClock(fixedTime: Date | string | number): Clock {
    const fixed = new Date(fixedTime);
    return {
        now: () => fixed.toISOString(),
        nowDate: () => new Date(fixed),
        nowMs: () => fixed.getTime(),
    };
}

// ============================================================================
// Active Clock (Swappable)
// ============================================================================

let activeClock: Clock = realClock;

/**
 * Get the current active clock.
 */
export function getClock(): Clock {
    return activeClock;
}

/**
 * Set a custom clock (for testing).
 * Returns a restore function.
 */
export function setClock(clock: Clock): () => void {
    const previous = activeClock;
    activeClock = clock;
    return () => {
        activeClock = previous;
    };
}

/**
 * Reset to real clock.
 */
export function resetClock(): void {
    activeClock = realClock;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get current timestamp as ISO string.
 */
export function now(): string {
    return activeClock.now();
}

/**
 * Get current timestamp as Date.
 */
export function nowDate(): Date {
    return activeClock.nowDate();
}

/**
 * Get current timestamp as Unix milliseconds.
 */
export function nowMs(): number {
    return activeClock.nowMs();
}
