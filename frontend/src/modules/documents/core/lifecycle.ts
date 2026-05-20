/**
 * Documents Module - Lifecycle State Machine
 *
 * Defines valid state transitions for document operations.
 */

// ============================================================================
// Lifecycle States
// ============================================================================

/**
 * Document lifecycle states.
 *
 * State machine:
 *   ┌──────────┐
 *   │   IDLE   │◄──────────────────────┐
 *   └────┬─────┘                       │
 *        │ select                      │ close
 *        ▼                             │
 *   ┌──────────┐                       │
 *   │ LOADING  │───────────────────────┤
 *   └────┬─────┘                       │
 *        │ loaded                      │
 *        ▼                             │
 *   ┌──────────┐                       │
 *   │  READY   │                       │
 *   └────┬─────┘                       │
 *        │ upload/delete               │
 *        ▼                             │
 *   ┌────────────┐                     │
 *   │ PROCESSING │─────────────────────┤
 *   └─────┬──────┘                     │
 *         │                            │
 *   ┌─────┴─────┐                      │
 *   ▼           ▼                      │
 * ┌──────┐   ┌─────────┐               │
 * │ DONE │   │  ERROR  │───────────────┘
 * └──────┘   └─────────┘
 */
export type DocumentLifecycleState =
    | "idle"           // No document selected
    | "loading"        // Fetching document
    | "ready"          // Document loaded, viewing
    | "uploading"      // Upload in progress
    | "processing"     // Backend pipeline running (parsing → parsed → chunking)
    | "deleting"       // Deletion in progress
    | "done"           // Operation completed (transient)
    | "error";         // Operation failed

export interface DocumentLifecycle {
    state: DocumentLifecycleState;
    error?: string;
    timestamp: Date;
}

// ============================================================================
// State Transitions
// ============================================================================

const TRANSITIONS: Record<DocumentLifecycleState, DocumentLifecycleState[]> = {
    idle: ["loading", "uploading"],
    loading: ["ready", "error", "idle"],
    ready: ["uploading", "deleting", "loading", "idle"],
    uploading: ["processing", "error", "idle"],
    processing: ["done", "error"],
    deleting: ["done", "error"],
    done: ["idle", "ready"],
    error: ["idle", "ready"],
};

export function canTransition(
    from: DocumentLifecycleState,
    to: DocumentLifecycleState
): boolean {
    return TRANSITIONS[from].includes(to);
}

export function transition(
    current: DocumentLifecycle,
    to: DocumentLifecycleState,
    error?: string
): DocumentLifecycle {
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

export function createInitialLifecycle(): DocumentLifecycle {
    return {
        state: "idle",
        timestamp: new Date(),
    };
}

// ============================================================================
// Lifecycle Queries
// ============================================================================

export function isBusy(lifecycle: DocumentLifecycle): boolean {
    return ["uploading", "processing", "deleting", "loading"].includes(lifecycle.state);
}

export function canUpload(lifecycle: DocumentLifecycle): boolean {
    return ["idle", "ready", "done"].includes(lifecycle.state);
}

export function canDelete(lifecycle: DocumentLifecycle): boolean {
    return ["ready"].includes(lifecycle.state);
}

export function isProcessing(lifecycle: DocumentLifecycle): boolean {
    return lifecycle.state === "processing";
}

/**
 * Map a backend processing_status string to the UI lifecycle state.
 * Use this when syncing backend status polls into the UI state machine.
 */
export function backendStatusToLifecycle(
    status: string
): DocumentLifecycleState {
    switch (status) {
        case "pending":
        case "parsing":
        case "parsed":
        case "chunking":
            return "processing";
        case "completed":
            return "done";
        case "failed":
            return "error";
        default:
            return "idle";
    }
}
