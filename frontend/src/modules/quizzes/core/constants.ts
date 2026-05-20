/**
 * Quiz Module - Constants & Invariants
 *
 * Business rules and configuration that must never be violated.
 */

// ============================================================================
// Business Invariants
// ============================================================================

export const QUIZ_INVARIANTS = {
    /** Minimum questions required for a valid quiz */
    MIN_QUESTIONS: 1,

    /** Maximum questions allowed per quiz */
    MAX_QUESTIONS: 100,

    /** Only one active attempt per quiz per session */
    MAX_ATTEMPTS_PER_SESSION: 1,

    /** Answers cannot be changed after submission */
    ANSWERS_IMMUTABLE_AFTER_SUBMIT: true,

    /** Minimum questions for AI generation */
    AI_MIN_QUESTIONS: 5,

    /** Maximum questions for AI generation */
    AI_MAX_QUESTIONS: 30,
} as const;

// ============================================================================
// Answer Rules
// ============================================================================

/**
 * Rules governing question answering behavior.
 * These invariants ensure consistent behavior across platforms.
 */
export const ANSWER_RULES = {
    /** Can the user change their answer before final submission? */
    allowChangeBeforeSubmit: true,

    /** Can questions be skipped (left unanswered)? */
    allowSkip: true,

    /** Must all questions be answered before submission? */
    requireAllAnswered: false,

    /** Is immediate feedback shown after each answer? */
    showImmediateFeedback: true,

    /** Can the user navigate back to previous questions? */
    allowBackNavigation: true,
} as const;

// ============================================================================
// Timer Policy
// ============================================================================

/**
 * Timer behavior for timed quizzes.
 * Defines authority and edge-case handling.
 */
export const TIMER_POLICY = {
    /** Who is authoritative for time? "server" = backend tracks, "client" = frontend tracks */
    authoritative: "server" as const,

    /** Allow resuming an in-progress timed quiz? */
    allowResume: true,

    /** Auto-submit when timer expires? */
    autoSubmitOnExpire: true,

    /** Grace period (seconds) after expiry before auto-submit */
    graceSeconds: 5,

    /** Show warning when time is low? */
    showLowTimeWarning: true,

    /** Threshold (seconds) for "low time" warning */
    lowTimeThreshold: 60,
} as const;

// ============================================================================
// Resume Policy
// ============================================================================

/**
 * Rules for resuming incomplete attempts.
 */
export const RESUME_POLICY = {
    /** Enable attempt resume functionality */
    enabled: true,

    /** Maximum time (seconds) an attempt can be resumed */
    maxResumeWindow: 86400, // 24 hours

    /** Auto-detect and resume on page load? */
    autoResumeOnLoad: true,
} as const;

// ============================================================================
// UI Constants
// ============================================================================

export const QUIZ_UI = {
    /** Default number of questions for AI generation */
    DEFAULT_QUESTION_COUNT: 10,

    /** Question count step for increment/decrement */
    QUESTION_COUNT_STEP: 5,

    /** Time per question for auto time limit (minutes) */
    TIME_PER_QUESTION: 2,

    /** Animation durations (ms) */
    ANIMATION: {
        ANSWER_FEEDBACK: 600,
        QUESTION_TRANSITION: 200,
        PROGRESS_UPDATE: 300,
    },
} as const;

// ============================================================================
// Grade Thresholds
// ============================================================================

export const GRADE_THRESHOLDS = {
    A_PLUS: 90,
    A: 80,
    B: 70,
    C: 60,
    D: 0,
} as const;

/**
 * Get grade info based on percentage.
 */
export function getGradeInfo(percentage: number): {
    grade: string;
    color: string;
    bg: string;
} {
    if (percentage >= GRADE_THRESHOLDS.A_PLUS) {
        return { grade: "A+", color: "text-accent-olive", bg: "bg-accent-olive/10" };
    }
    if (percentage >= GRADE_THRESHOLDS.A) {
        return { grade: "A", color: "text-accent-olive", bg: "bg-accent-olive/10" };
    }
    if (percentage >= GRADE_THRESHOLDS.B) {
        return { grade: "B", color: "text-primary", bg: "bg-primary/10" };
    }
    if (percentage >= GRADE_THRESHOLDS.C) {
        return { grade: "C", color: "text-yellow-400", bg: "bg-yellow-500/10" };
    }
    return { grade: "D", color: "text-destructive", bg: "bg-destructive/10" };
}
