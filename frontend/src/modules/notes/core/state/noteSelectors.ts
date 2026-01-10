/**
 * Notes Module - Core Selectors
 * Derived state from noteStore for common access patterns.
 */

import { useNoteStore } from "./noteStore";
import { isBusy, canEdit, canSave, canDelete } from "../engine/lifecycle";

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get the active note ID (reactive).
 */
export function useActiveNoteId(): number | null {
    return useNoteStore((state) => state.activeNoteId);
}

/**
 * Get the active note data (reactive).
 */
export function useActiveNoteData() {
    return useNoteStore((state) => state.activeNote);
}

/**
 * Check if a note operation is in progress.
 */
export function useNoteIsBusy(): boolean {
    return useNoteStore((state) => isBusy(state.lifecycle));
}

/**
 * Check if the active note can be edited.
 */
export function useNoteCanEdit(): boolean {
    return useNoteStore((state) => canEdit(state.lifecycle));
}

/**
 * Check if the active note can be saved.
 */
export function useNoteCanSave(): boolean {
    return useNoteStore((state) => canSave(state.lifecycle));
}

/**
 * Check if the active note can be deleted.
 */
export function useNoteCanDelete(): boolean {
    return useNoteStore((state) => canDelete(state.lifecycle));
}

/**
 * Get lifecycle error if any.
 */
export function useNoteError(): string | undefined {
    return useNoteStore((state) => state.lifecycle.error);
}
