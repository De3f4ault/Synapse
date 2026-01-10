/**
 * Shared Time - Duration Helpers
 *
 * Utilities for working with time durations.
 */

// ============================================================================
// Duration Type
// ============================================================================

/**
 * A duration in milliseconds.
 * Using a branded type for type safety.
 */
export type DurationMs = number & { readonly __brand: "DurationMs" };

/**
 * Create a duration from milliseconds.
 */
export function ms(value: number): DurationMs {
    return value as DurationMs;
}

/**
 * Create a duration from seconds.
 */
export function seconds(value: number): DurationMs {
    return (value * 1000) as DurationMs;
}

/**
 * Create a duration from minutes.
 */
export function minutes(value: number): DurationMs {
    return (value * 60 * 1000) as DurationMs;
}

/**
 * Create a duration from hours.
 */
export function hours(value: number): DurationMs {
    return (value * 60 * 60 * 1000) as DurationMs;
}

/**
 * Create a duration from days.
 */
export function days(value: number): DurationMs {
    return (value * 24 * 60 * 60 * 1000) as DurationMs;
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Format a duration as human-readable string.
 * @example formatDuration(90000) => "1m 30s"
 */
export function formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);

    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    if (mins < 60) {
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }

    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hrs < 24) {
        return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
    }

    const d = Math.floor(hrs / 24);
    const remainingHrs = hrs % 24;

    return remainingHrs > 0 ? `${d}d ${remainingHrs}h` : `${d}d`;
}

/**
 * Format a duration as mm:ss or hh:mm:ss.
 * @example formatDurationClock(90000) => "01:30"
 */
export function formatDurationClock(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    if (hrs > 0) {
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }

    return `${pad(mins)}:${pad(secs)}`;
}

// ============================================================================
// Time Window
// ============================================================================

/**
 * A time window for analytics and filtering.
 */
export interface TimeWindow {
    start: Date;
    end: Date;
}

/**
 * Create a time window for the last N days.
 */
export function lastNDays(n: number, from: Date = new Date()): TimeWindow {
    const end = new Date(from);
    const start = new Date(from);
    start.setDate(start.getDate() - n);
    start.setHours(0, 0, 0, 0);

    return { start, end };
}

/**
 * Create a time window for today.
 */
export function today(from: Date = new Date()): TimeWindow {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);

    const end = new Date(from);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

/**
 * Create a time window for this week (Monday-Sunday).
 */
export function thisWeek(from: Date = new Date()): TimeWindow {
    const start = new Date(from);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

/**
 * Check if a date is within a time window.
 */
export function isWithinWindow(date: Date, window: TimeWindow): boolean {
    return date >= window.start && date <= window.end;
}
