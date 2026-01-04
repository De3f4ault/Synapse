/**
 * Document Viewer Module - Public API
 *
 * This is the ONLY entry point for the viewer module.
 * No deep imports across modules allowed.
 *
 * Viewer owns:
 * - HOW documents are displayed (zoom, theme, page)
 * - Document rendering components
 * - Viewer UI state
 *
 * Viewer does NOT own:
 * - WHICH document is active (that's core)
 * - Document list or filtering (that's list)
 */

// Components
export {
    DocumentViewer,
    PDFViewer,
    DOCXViewer,
    EPUBViewer,
    HTMLViewer,
    MarkdownViewer,
    SpreadsheetViewer,
    TextViewer,
    ChunkExplorer,
    ProcessingStatus,
    ThemeSelector,
} from "./components";

// Hooks
export { useDocumentViewer } from "./hooks";

// State
export { useViewerStore, type ViewerTheme } from "./state";
