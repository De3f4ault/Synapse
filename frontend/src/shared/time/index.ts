/**
 * Shared Time - Public API
 */

// Clock
export {
    type Clock,
    getClock,
    setClock,
    resetClock,
    createMockClock,
    now,
    nowDate,
    nowMs,
} from "./clock";

// Duration
export {
    type DurationMs,
    type TimeWindow,
    ms,
    seconds,
    minutes,
    hours,
    days,
    formatDuration,
    formatDurationClock,
    lastNDays,
    today,
    thisWeek,
    isWithinWindow,
} from "./duration";
