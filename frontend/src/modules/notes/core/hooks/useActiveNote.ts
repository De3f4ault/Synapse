/**
 * Notes Module - useActiveNote Hook
 * Convenience hook combining note data fetching with store state.
 */

import { useEffect } from "react";
import { useNote } from "@/api/hooks/useNotes";
import { useNoteStore } from "../state/noteStore";
import { emitNoteEvent, noteViewed } from "../engine/events";

/**
 * Hook to manage the active note.
 *
 * - Fetches note data from API
 * - Syncs to core noteStore
 * - Emits view event for analytics
 *
 * @param noteId - The note ID to activate (from route params)
 */
export function useActiveNote(noteId: number | null) {
    const { data: note, isLoading, error } = useNote(noteId ?? 0);
    const { setActiveNote, resetForNote, activeNoteId } = useNoteStore();

    // Reset session when note ID changes
    useEffect(() => {
        if (noteId !== activeNoteId) {
            resetForNote(noteId);
        }
    }, [noteId, activeNoteId, resetForNote]);

    // Sync fetched note to store
    useEffect(() => {
        if (note && !isLoading) {
            setActiveNote(note);
            // Emit view event for analytics/AI
            emitNoteEvent(noteViewed(note.id));
        }
    }, [note, isLoading, setActiveNote]);

    // Clear on unmount
    useEffect(() => {
        return () => {
            resetForNote(null);
        };
    }, [resetForNote]);

    return {
        note,
        isLoading,
        error,
        noteId: activeNoteId,
    };
}
