/**
 * Notes Module - Core Public API
 *
 * RULE: All imports from notes/core go through this file.
 * No deep imports allowed.
 */

// ============================================================================
// Types
// ============================================================================

export type {
    NoteResponse,
    NoteTreeNode,
    NoteCreate,
    NoteUpdate,
    NoteTreeItem,
    EditorMode,
    EditorState,
    TextSelection,
    ViewMode,
    TreeExpansionState,
    AIProcessingStatus,
    AIAction,
    ToolDockAction,
    KeyboardShortcut,
    NoteMetadata,
    // Error types
    NoteErrorCode,
    NoteError,
} from "./engine/types";
export { createNoteError } from "./engine/types";

// ============================================================================
// Invariants
// ============================================================================

export {
    MAX_HIERARCHY_DEPTH,
    WARN_CHILDREN_COUNT,
    NOTE_FORMATS,
    DEFAULT_NOTE_FORMAT,
    MAX_TITLE_LENGTH,
    MIN_TITLE_LENGTH,
    MAX_CONTENT_LENGTH,
    MIN_CONTENT_LENGTH,
    AUTOSAVE_DELAY_MS,
    AUTOSAVE_RETRY_COUNT,
    AUTOSAVE_RETRY_DELAY_MS,
    MIN_SEARCH_QUERY_LENGTH,
    SEARCH_DEBOUNCE_MS,
    canAddChild,
    isValidTitle,
    isValidContent,
    isValidFormat,
} from "./engine/invariants";
export type { NoteFormat } from "./engine/invariants";

// ============================================================================
// Lifecycle
// ============================================================================

export type { NoteLifecycleState, NoteLifecycle } from "./engine/lifecycle";
export {
    canTransition,
    transition,
    createInitialLifecycle,
    isBusy,
    canEdit,
    canSave,
    canDelete,
} from "./engine/lifecycle";

// ============================================================================
// Events
// ============================================================================

// New payload types (recommended for new code)
export type {
    NoteCreatedPayload,
    NoteUpdatedPayload,
    NoteDeletedPayload,
    NoteRestoredPayload,
    NoteViewedPayload,
    NoteSearchedPayload,
} from "./engine/events";

// Legacy types (for backward compatibility)
export type {
    NoteEvent,
    NoteCreatedEvent,
    NoteUpdatedEvent,
    NoteDeletedEvent,
    NoteRestoredEvent,
    NoteViewedEvent,
    NoteSearchedEvent,
} from "./engine/events";

// Legacy API (deprecated, for backward compatibility)
export {
    subscribeToNoteEvents,
    emitNoteEvent,
    noteCreated,
    noteUpdated,
    noteDeleted,
    noteRestored,
    noteViewed,
    noteSearched,
} from "./engine/events";

// New API (recommended for new code)
export {
    emitNoteCreated,
    emitNoteUpdated,
    emitNoteDeleted,
    emitNoteRestored,
    emitNoteViewed,
    emitNoteSearched,
} from "./engine/events";


// ============================================================================
// State
// ============================================================================

export {
    useNoteStore,
    onNoteChange,
    useActiveNoteId,
    useActiveNoteData,
    useNoteIsBusy,
    useNoteCanEdit,
    useNoteCanSave,
    useNoteCanDelete,
    useNoteError,
} from "./state";

// ============================================================================
// Hooks
// ============================================================================

export { useActiveNote } from "./hooks";
