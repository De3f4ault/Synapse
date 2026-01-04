/**
 * Notes Module - Lifecycle State Machine
 * Defines valid state transitions for note operations.
 *
 * RULE: All transitions are validated. Invalid transitions throw.
 */

// ============================================================================
// Lifecycle States
// ============================================================================

/** States a note can be in during its lifecycle */
export type NoteLifecycleState =
    | "idle"           // No active operation
    | "loading"        // Fetching from server
    | "editing"        // User is modifying content
    | "saving"         // Persisting changes to server
    | "saved"          // Successfully persisted (transient)
    | "error"          // Operation failed
    | "deleting"       // Deletion in progress
    | "deleted";       // Successfully deleted (terminal)

/** Lifecycle state with metadata */
export interface NoteLifecycle {
    state: NoteLifecycleState;
    error?: string;
    timestamp: Date;
}

// ============================================================================
// State Transitions
// ============================================================================

/** Valid state transitions */
const TRANSITIONS: Record<NoteLifecycleState, NoteLifecycleState[]> = {
    idle: ["loading", "editing", "deleting"],
    loading: ["idle", "editing", "error"],
    editing: ["saving", "idle"],
    saving: ["saved", "error", "editing"],
    saved: ["idle", "editing"],
    error: ["idle", "editing", "saving"],
    deleting: ["deleted", "error"],
    deleted: [], // Terminal state
};

/**
 * Check if a transition is valid.
 */
export function canTransition(
    from: NoteLifecycleState,
    to: NoteLifecycleState
): boolean {
    return TRANSITIONS[from].includes(to);
}

/**
 * Perform a validated state transition.
 * @throws Error if transition is invalid
 */
export function transition(
    current: NoteLifecycle,
    to: NoteLifecycleState,
    error?: string
): NoteLifecycle {
    if (!canTransition(current.state, to)) {
        throw new Error(
            `Invalid lifecycle transition: ${current.state} → ${to}`
        );
    }

    return {
        state: to,
        error: to === "error" ? error : undefined,
        timestamp: new Date(),
    };
}

/**
 * Create initial lifecycle state.
 */
export function createInitialLifecycle(): NoteLifecycle {
    return {
        state: "idle",
        timestamp: new Date(),
    };
}

// ============================================================================
// Lifecycle Queries
// ============================================================================

/**
 * Check if note is in a "busy" state (operation in progress).
 */
export function isBusy(lifecycle: NoteLifecycle): boolean {
    return ["loading", "saving", "deleting"].includes(lifecycle.state);
}

/**
 * Check if note can be edited.
 */
export function canEdit(lifecycle: NoteLifecycle): boolean {
    return ["idle", "saved", "error"].includes(lifecycle.state);
}

/**
 * Check if note can be saved.
 */
export function canSave(lifecycle: NoteLifecycle): boolean {
    return lifecycle.state === "editing";
}

/**
 * Check if note can be deleted.
 */
export function canDelete(lifecycle: NoteLifecycle): boolean {
    return ["idle", "editing", "saved", "error"].includes(lifecycle.state);
}
