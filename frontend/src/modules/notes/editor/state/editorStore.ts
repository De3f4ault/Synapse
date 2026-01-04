/**
 * Notes Module - Editor Store
 * Manages editor state: mode, content, autosave, selection, errors.
 *
 * PATTERN: EditorMode is owned by this store (not core, not pages).
 * PATTERN: Includes failure state for autosave (saveError, lastFailedAt).
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { EditorMode, TextSelection } from "../../core";
import { onNoteChange } from "../../core";

// ============================================================================
// Store State
// ============================================================================

interface EditorState {
    // Content
    title: string;
    content: string;
    originalTitle: string;
    originalContent: string;

    // Mode - OWNED BY EDITOR
    mode: EditorMode;

    // Dirty tracking
    isDirty: boolean;

    // Autosave
    lastSaved: Date | null;
    isAutosaving: boolean;

    // Failure handling
    saveError: string | null;
    lastFailedAt: Date | null;

    // Selection
    selection: TextSelection | null;

    // Actions
    setTitle: (title: string) => void;
    setContent: (content: string) => void;
    setMode: (mode: EditorMode) => void;
    toggleMode: () => void;
    setSelection: (start: number, end: number) => void;
    clearSelection: () => void;

    // Autosave actions
    startAutosave: () => void;
    autosaveSuccess: () => void;
    autosaveFailure: (error: string) => void;
    clearError: () => void;

    // Lifecycle
    initialize: (title: string, content: string) => void;
    markClean: () => void;
    reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
    title: "",
    content: "",
    originalTitle: "",
    originalContent: "",
    mode: "view" as EditorMode,
    isDirty: false,
    lastSaved: null,
    isAutosaving: false,
    saveError: null,
    lastFailedAt: null,
    selection: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useEditorStore = create<EditorState>()(
    devtools(
        subscribeWithSelector((set) => ({
            ...initialState,

            setTitle: (title) =>
                set(
                    (state) => ({
                        title,
                        isDirty: title !== state.originalTitle || state.content !== state.originalContent,
                    }),
                    false,
                    "setTitle"
                ),

            setContent: (content) =>
                set(
                    (state) => ({
                        content,
                        isDirty: content !== state.originalContent || state.title !== state.originalTitle,
                    }),
                    false,
                    "setContent"
                ),

            setMode: (mode) =>
                set({ mode }, false, "setMode"),

            toggleMode: () =>
                set(
                    (state) => ({ mode: state.mode === "edit" ? "view" : "edit" }),
                    false,
                    "toggleMode"
                ),

            setSelection: (start, end) =>
                set({ selection: { start, end } }, false, "setSelection"),

            clearSelection: () =>
                set({ selection: null }, false, "clearSelection"),

            // Autosave lifecycle
            startAutosave: () =>
                set({ isAutosaving: true }, false, "startAutosave"),

            autosaveSuccess: () =>
                set(
                    (state) => ({
                        isAutosaving: false,
                        isDirty: false,
                        lastSaved: new Date(),
                        saveError: null,
                        originalTitle: state.title,
                        originalContent: state.content,
                    }),
                    false,
                    "autosaveSuccess"
                ),

            autosaveFailure: (error) =>
                set(
                    {
                        isAutosaving: false,
                        saveError: error,
                        lastFailedAt: new Date(),
                    },
                    false,
                    "autosaveFailure"
                ),

            clearError: () =>
                set({ saveError: null, lastFailedAt: null }, false, "clearError"),

            // Lifecycle
            initialize: (title, content) =>
                set(
                    {
                        title,
                        content,
                        originalTitle: title,
                        originalContent: content,
                        isDirty: false,
                        saveError: null,
                        lastFailedAt: null,
                    },
                    false,
                    "initialize"
                ),

            markClean: () =>
                set(
                    (state) => ({
                        isDirty: false,
                        originalTitle: state.title,
                        originalContent: state.content,
                    }),
                    false,
                    "markClean"
                ),

            reset: () =>
                set(initialState, false, "reset"),
        })),
        { name: "notes-editor-store" }
    )
);

// ============================================================================
// Session Boundary: Reset on Note Change
// ============================================================================

// Subscribe to note changes and reset editor
onNoteChange((noteId) => {
    if (noteId === null) {
        useEditorStore.getState().reset();
    }
});

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Check if editor has unsaved changes.
 */
export function useEditorIsDirty(): boolean {
    return useEditorStore((state) => state.isDirty);
}

/**
 * Check if autosave is in progress.
 */
export function useEditorIsAutosaving(): boolean {
    return useEditorStore((state) => state.isAutosaving);
}

/**
 * Get current editor mode.
 */
export function useEditorMode(): EditorMode {
    return useEditorStore((state) => state.mode);
}

/**
 * Check if there's a save error.
 */
export function useEditorHasError(): boolean {
    return useEditorStore((state) => state.saveError !== null);
}

/**
 * Get save error message.
 */
export function useEditorError(): string | null {
    return useEditorStore((state) => state.saveError);
}
