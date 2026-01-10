/**
 * Notes Module - Core Note Store
 * Manages active note identity and session boundary.
 *
 * RULE: When activeNoteId changes, dependent stores MUST reset.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { NoteResponse } from "@/api/generated";
import { createInitialLifecycle, type NoteLifecycle } from "../engine/lifecycle";

// ============================================================================
// Store State
// ============================================================================

interface NoteState {
    // Active note being viewed/edited
    activeNoteId: number | null;
    activeNote: NoteResponse | null;
    lifecycle: NoteLifecycle;

    // Actions
    setActiveNote: (note: NoteResponse | null) => void;
    clearActiveNote: () => void;

    /**
     * CRITICAL: Session boundary reset.
     * Call this when switching notes to reset dependent state.
     * Subscribers (editorStore, aiStore) should listen and reset.
     */
    resetForNote: (noteId: number | null) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useNoteStore = create<NoteState>()(
    devtools(
        subscribeWithSelector((set) => ({
            activeNoteId: null,
            activeNote: null,
            lifecycle: createInitialLifecycle(),

            setActiveNote: (note) =>
                set(
                    {
                        activeNote: note,
                        activeNoteId: note?.id ?? null,
                    },
                    false,
                    "setActiveNote"
                ),

            clearActiveNote: () =>
                set(
                    {
                        activeNote: null,
                        activeNoteId: null,
                        lifecycle: createInitialLifecycle(),
                    },
                    false,
                    "clearActiveNote"
                ),

            resetForNote: (noteId) =>
                set(
                    (state) => ({
                        activeNoteId: noteId,
                        activeNote: noteId === state.activeNoteId ? state.activeNote : null,
                        lifecycle: createInitialLifecycle(),
                    }),
                    false,
                    "resetForNote"
                ),
        })),
        { name: "note-store" }
    )
);

// ============================================================================
// Session Boundary Subscription
// ============================================================================

/**
 * Subscribe to active note changes for session boundary enforcement.
 * Use this in dependent stores to reset when note changes.
 *
 * @example
 * onNoteChange((noteId) => {
 *   editorStore.getState().reset();
 * });
 */
export function onNoteChange(callback: (noteId: number | null) => void): () => void {
    return useNoteStore.subscribe(
        (state) => state.activeNoteId,
        (noteId) => callback(noteId)
    );
}
