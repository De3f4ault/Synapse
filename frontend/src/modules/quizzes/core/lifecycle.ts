/**
 * Quiz Module - Lifecycle States
 *
 * Defines the finite state machine for quiz attempts.
 * All state transitions must be explicit and guarded.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        QUIZ ATTEMPT FSM                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *                              ┌──────────┐
 *                              │   IDLE   │◄──────────────────────┐
 *                              └────┬─────┘                       │
 *                                   │ start()                     │ retry()
 *                                   ▼                             │
 *                              ┌──────────┐                       │
 *                              │ LOADING  │───────────────────────┤
 *                              └────┬─────┘                       │
 *                   ┌───────────────┼───────────────┐             │
 *                   │               │               │             │
 *                   ▼               ▼               ▼             │
 *              ┌─────────┐    ┌──────────┐    ┌─────────┐         │
 *              │ ACTIVE  │◄───│ RESUMING │    │  ERROR  │─────────┘
 *              └────┬────┘    └──────────┘    └─────────┘
 *                   │              ▲
 *                   │              │ resume()
 *     ┌─────────────┼──────────────┘
 *     │             │
 *     │  expired    │ submit()
 *     │  (timer)    │
 *     ▼             ▼
 * ┌─────────┐  ┌────────────┐
 * │ EXPIRED │  │ SUBMITTING │
 * └────┬────┘  └─────┬──────┘
 *      │             │
 *      │             ▼
 *      │       ┌───────────┐
 *      └──────►│ COMPLETED │  (terminal)
 *              └───────────┘
 *
 * States:
 *   IDLE       - No attempt, waiting for user action
 *   LOADING    - Starting new attempt OR detecting existing attempt
 *   RESUMING   - Rehydrating existing attempt from server
 *   ACTIVE     - User is answering questions
 *   EXPIRED    - Timer ran out (auto-submits)
 *   SUBMITTING - Sending answers to server
 *   COMPLETED  - Results available (terminal)
 *   ERROR      - Something failed (recoverable via retry)
 *
 * Key Invariants:
 *   - Only one active attempt per quiz per session
 *   - RESUMING only from server-side incomplete attempt
 *   - EXPIRED auto-transitions to COMPLETED after submission
 *   - ERROR is always recoverable via IDLE
 */

/**
 * Quiz attempt lifecycle states.
 */
export enum QuizAttemptState {
    /** Initial state, no attempt started */
    IDLE = "IDLE",

    /** Loading quiz data / starting attempt / detecting existing attempt */
    LOADING = "LOADING",

    /** Rehydrating an existing incomplete attempt from server */
    RESUMING = "RESUMING",

    /** Quiz is active, user is answering questions */
    ACTIVE = "ACTIVE",

    /** Timer expired, auto-submitting */
    EXPIRED = "EXPIRED",

    /** Submitting answers to backend */
    SUBMITTING = "SUBMITTING",

    /** Quiz completed, results available */
    COMPLETED = "COMPLETED",

    /** Error state (recoverable) */
    ERROR = "ERROR",
}

/**
 * Terminal states - no transitions out.
 */
export const TERMINAL_STATES: QuizAttemptState[] = [QuizAttemptState.COMPLETED];

/**
 * Valid state transitions.
 * Used to guard against invalid state changes.
 */
export const VALID_TRANSITIONS: Record<QuizAttemptState, QuizAttemptState[]> = {
    [QuizAttemptState.IDLE]: [QuizAttemptState.LOADING],

    [QuizAttemptState.LOADING]: [
        QuizAttemptState.ACTIVE, // New attempt started
        QuizAttemptState.RESUMING, // Existing attempt detected
        QuizAttemptState.ERROR,
    ],

    [QuizAttemptState.RESUMING]: [
        QuizAttemptState.ACTIVE, // Resume successful
        QuizAttemptState.ERROR, // Resume failed
    ],

    [QuizAttemptState.ACTIVE]: [
        QuizAttemptState.SUBMITTING, // User submits
        QuizAttemptState.EXPIRED, // Timer ran out
        QuizAttemptState.ERROR,
    ],

    [QuizAttemptState.EXPIRED]: [
        QuizAttemptState.SUBMITTING, // Auto-submit on expire
        QuizAttemptState.COMPLETED, // Direct completion if no-op
    ],

    [QuizAttemptState.SUBMITTING]: [
        QuizAttemptState.COMPLETED,
        QuizAttemptState.ERROR,
    ],

    [QuizAttemptState.COMPLETED]: [], // Terminal state

    [QuizAttemptState.ERROR]: [QuizAttemptState.IDLE], // Can retry
};

/**
 * Check if a state transition is valid.
 */
export function canTransition(
    from: QuizAttemptState,
    to: QuizAttemptState
): boolean {
    return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Guard function to enforce valid transitions.
 * Throws if transition is invalid.
 */
export function assertTransition(
    from: QuizAttemptState,
    to: QuizAttemptState
): void {
    if (!canTransition(from, to)) {
        throw new Error(
            `Invalid state transition: ${from} → ${to}. Valid transitions from ${from}: ${VALID_TRANSITIONS[from].join(", ") || "none"}`
        );
    }
}

/**
 * Check if a state is terminal.
 */
export function isTerminalState(state: QuizAttemptState): boolean {
    return TERMINAL_STATES.includes(state);
}
