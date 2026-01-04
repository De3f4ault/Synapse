/**
 * Notes Module - Canonical Domain Types
 * Single source of truth for all note-related type definitions.
 *
 * RULE: Frontend types extend backend types, never replace them.
 */

import type { NoteResponse, NoteTreeNode, NoteCreate, NoteUpdate } from "@/api/generated";

// Re-export API types as canonical
export type { NoteResponse, NoteTreeNode, NoteCreate, NoteUpdate };

// ============================================================================
// Tree Types
// ============================================================================

/**
 * Extended tree item with recursive children.
 * Uses NoteTreeNode (not NoteResponse) to stay aligned with backend semantics.
 */
export type NoteTreeItem = NoteTreeNode & {
    children?: NoteTreeItem[];
};

// ============================================================================
// Editor Types
// ============================================================================

/** Editor viewing/editing mode */
export type EditorMode = "edit" | "view";

/** Editor state for draft content */
export interface EditorState {
    content: string;
    title: string;
    isDirty: boolean;
    lastSaved: Date | null;
    selection: TextSelection | null;
    mode: EditorMode;
    // Failure handling for autosave
    saveError: string | null;
    lastFailedAt: Date | null;
}

/** Text selection range */
export interface TextSelection {
    start: number;
    end: number;
}

// ============================================================================
// List Types
// ============================================================================

/** View modes for note list display */
export type ViewMode = "grid" | "list" | "tree";

/** Tree navigation state */
export interface TreeExpansionState {
    expandedIds: number[]; // Stored as array for safe persistence
    selectedId: number | null;
}

// ============================================================================
// AI Types
// ============================================================================

/** AI processing status */
export interface AIProcessingStatus {
    isProcessing: boolean;
    action?: AIAction;
}

/** Available AI actions */
export type AIAction = "summarize" | "tags" | "expand" | "correct";

// ============================================================================
// Tool Dock Types
// ============================================================================

/** Actions available from the editor tool dock */
export type ToolDockAction =
    | "toggle_edit"
    | "save"
    | "ai_summarize"
    | "ai_tags"
    | "ai_expand"
    | "delete";

/** Keyboard shortcut configuration */
export interface KeyboardShortcut {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    action: ToolDockAction;
    description: string;
}

// ============================================================================
// Metadata Types
// ============================================================================

/** Note metadata computed from content */
export interface NoteMetadata {
    wordCount: number;
    charCount: number;
    readingTime: number; // minutes
    lastModified: Date | null;
}

// ============================================================================
// Error Taxonomy
// ============================================================================

/**
 * Domain-specific error codes for note operations.
 * Used for consistent error handling across the module.
 */
export type NoteErrorCode =
    | "NOTE_NOT_FOUND"
    | "NOTE_DELETED"
    | "SAVE_FAILED"
    | "AUTOSAVE_FAILED"
    | "DELETE_FAILED"
    | "LOAD_FAILED"
    | "VALIDATION_FAILED"
    | "VERSION_CONFLICT"
    | "PERMISSION_DENIED"
    | "AI_PROCESSING_FAILED"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";

/**
 * Structured error for note operations.
 */
export interface NoteError {
    code: NoteErrorCode;
    message: string;
    recoverable: boolean;
    details?: unknown;
}

/**
 * Create a structured note error.
 */
export function createNoteError(
    code: NoteErrorCode,
    message: string,
    recoverable = true,
    details?: unknown
): NoteError {
    return { code, message, recoverable, details };
}

