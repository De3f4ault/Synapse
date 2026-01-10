/**
 * Notes Module - useNoteVersions Hook
 * Manages version history fetching and restoration.
 */

import { useCallback } from "react";
import { useNoteVersions as useVersionsQuery, useUpdateNote } from "@/api/hooks/useNotes";
import { toast } from "sonner";
import { emitNoteEvent, noteRestored } from "../../core";

// ============================================================================
// Types
// ============================================================================

export interface NoteVersion {
    id: number;
    version_number: number;
    title: string;
    content: string;
    format: string;
    created_at: string;
    created_by?: number;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing note version history.
 *
 * Features:
 * - Fetches version history from API
 * - Provides restore functionality
 * - Emits restore events
 */
export function useNoteVersions(noteId: number | null) {
    const { data, isLoading, error } = useVersionsQuery(noteId ?? 0);
    const updateNote = useUpdateNote();

    const versions = (data ?? []) as unknown as NoteVersion[];

    const restoreVersion = useCallback(
        async (versionNumber: number) => {
            if (!noteId) return;

            const version = versions.find((v) => v.version_number === versionNumber);
            if (!version) {
                toast.error("Version not found");
                return;
            }

            try {
                await updateNote.mutateAsync({
                    noteId,
                    data: {
                        title: version.title,
                        content: version.content,
                    },
                });

                // Emit restore event
                emitNoteEvent(noteRestored(noteId, versionNumber));

                toast.success(`Restored to version ${versionNumber}`);
            } catch (err) {
                toast.error("Failed to restore version");
                console.error("Restore error:", err);
            }
        },
        [noteId, versions, updateNote]
    );

    const previewVersion = useCallback(
        (versionNumber: number) => {
            return versions.find((v) => v.version_number === versionNumber);
        },
        [versions]
    );

    return {
        versions,
        isLoading,
        error,
        restoreVersion,
        previewVersion,
        isRestoring: updateNote.isPending,
    };
}
