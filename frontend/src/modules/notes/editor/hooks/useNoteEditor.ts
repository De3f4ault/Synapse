/**
 * Notes Module - useNoteEditor Hook
 * Manages editor lifecycle with autosave and Zustand store integration.
 *
 * MIGRATED FROM: pages/notes/hooks/useNoteEditor.ts
 * PATTERN: Uses editorStore instead of local state.
 */

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "../state/editorStore";
import { AUTOSAVE_DELAY_MS } from "../../core";
import type { NoteResponse } from "../../core";

// ============================================================================
// Types
// ============================================================================

interface UseNoteEditorOptions {
    note: NoteResponse | null | undefined;
    onSave: (data: { title: string; content: string }) => Promise<void>;
    autoSaveEnabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing note editor state with autosave.
 *
 * Features:
 * - Syncs with editorStore
 * - Debounced autosave
 * - Error handling with retry
 * - Mode management
 */
export function useNoteEditor({
    note,
    onSave,
    autoSaveEnabled = true,
}: UseNoteEditorOptions) {
    const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

    const {
        title,
        content,
        mode,
        isDirty,
        isAutosaving,
        saveError,
        setTitle,
        setContent,
        setMode,
        toggleMode,
        initialize,
        startAutosave,
        autosaveSuccess,
        autosaveFailure,
        clearError,
        reset,
    } = useEditorStore();

    // Initialize editor when note loads
    useEffect(() => {
        if (note) {
            initialize(note.title, note.content || "");
        }
        return () => {
            // Clear autosave timer on unmount
            if (autosaveTimer.current) {
                clearTimeout(autosaveTimer.current);
            }
        };
    }, [note?.id, initialize]);

    // Autosave effect
    useEffect(() => {
        if (!autoSaveEnabled || !isDirty || isAutosaving) {
            return;
        }

        // Clear existing timer
        if (autosaveTimer.current) {
            clearTimeout(autosaveTimer.current);
        }

        // Set new timer
        autosaveTimer.current = setTimeout(async () => {
            startAutosave();
            try {
                await onSave({ title, content });
                autosaveSuccess();
            } catch (error) {
                autosaveFailure(
                    error instanceof Error ? error.message : "Autosave failed"
                );
            }
        }, AUTOSAVE_DELAY_MS);

        return () => {
            if (autosaveTimer.current) {
                clearTimeout(autosaveTimer.current);
            }
        };
    }, [
        title,
        content,
        isDirty,
        isAutosaving,
        autoSaveEnabled,
        onSave,
        startAutosave,
        autosaveSuccess,
        autosaveFailure,
    ]);

    // Manual save
    const save = useCallback(async () => {
        if (!isDirty) return;

        startAutosave();
        try {
            await onSave({ title, content });
            autosaveSuccess();
        } catch (error) {
            autosaveFailure(
                error instanceof Error ? error.message : "Save failed"
            );
        }
    }, [title, content, isDirty, onSave, startAutosave, autosaveSuccess, autosaveFailure]);

    return {
        // State
        title,
        content,
        mode,
        isDirty,
        isAutosaving,
        saveError,

        // Actions
        setTitle,
        setContent,
        setMode,
        toggleMode,
        save,
        clearError,
        reset,
    };
}
