/**
 * Document List Module - Public API
 *
 * This is the ONLY entry point for the list module.
 * No deep imports across modules allowed.
 *
 * List owns:
 * - Document discovery and display
 * - View mode (grid/list)
 * - Filtering and sorting
 *
 * List does NOT own:
 * - Active document state (that's core)
 * - How documents are viewed (that's viewer)
 */

// Components
export { DocumentListItem, DocumentGrid, DocumentTable } from "./components";

// Hooks
export { useDocuments, useThumbnails } from "./hooks";

// State
export { useListStore, type ViewMode } from "./state";
