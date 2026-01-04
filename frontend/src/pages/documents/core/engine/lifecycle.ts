/**
 * Document Lifecycle Engine
 *
 * Pure functions for document lifecycle transitions.
 * No side effects, no state mutation.
 */

import { DocumentStatus, LIFECYCLE_TRANSITIONS } from "./types";

/**
 * Check if a lifecycle transition is valid
 */
export function canTransition(
    from: DocumentStatus,
    to: DocumentStatus
): boolean {
    return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get valid next states from current state
 */
export function getNextStates(current: DocumentStatus): DocumentStatus[] {
    return LIFECYCLE_TRANSITIONS[current] ?? [];
}

/**
 * Check if document is in a terminal state
 */
export function isTerminalState(status: DocumentStatus): boolean {
    // Ready and archived are "stable" states (can still transition but don't require action)
    return status === "ready" || status === "archived";
}

/**
 * Check if document is in an error state
 */
export function isErrorState(status: DocumentStatus): boolean {
    return status === "error";
}

/**
 * Check if document is processing
 */
export function isProcessingState(status: DocumentStatus): boolean {
    return status === "uploading" || status === "processing" || status === "indexed";
}
