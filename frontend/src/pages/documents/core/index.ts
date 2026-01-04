/**
 * Document Core Module - Public API
 *
 * This is the ONLY entry point for the core documents module.
 * No deep imports across modules allowed.
 *
 * Core owns:
 * - Canonical document types
 * - Active document state
 * - Lifecycle transitions
 *
 * Core does NOT own:
 * - How documents are viewed (zoom, page) → viewer module
 * - How documents are listed (filters, sorting) → list module
 * - How documents are uploaded (progress, queue) → upload module
 */

// Engine types (for external typing only)
export type {
    DocumentStatus,
    DocumentSector,
    EnhancedDocument,
    DocumentCoreState,
    ChunkMetadata,
    DocumentFilters,
} from "./engine/types";

export {
    SECTOR_SUGGESTIONS,
    LIFECYCLE_TRANSITIONS,
    INITIAL_CORE_STATE,
    DEFAULT_FILTERS,
} from "./engine/types";

export {
    canTransition,
    getNextStates,
    isTerminalState,
    isErrorState,
    isProcessingState,
} from "./engine/lifecycle";

// State (selectors only - store internals are private)
export { useDocumentStore } from "./state/documentStore";
export {
    useActiveDocumentId,
    useActiveDocument,
    useHasActiveDocument,
    useIsDocumentActive,
    useDocumentError,
    useDocumentActions,
} from "./state/documentSelectors";

// Hooks
export { useSelectDocument } from "./hooks";
