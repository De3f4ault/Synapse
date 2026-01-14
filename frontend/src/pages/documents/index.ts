/**
 * Documents Module - Public API
 *
 * This is the ONLY entry point for the documents module.
 * No deep imports across modules allowed.
 *
 * Architecture:
 * - core/   → Canonical document types, lifecycle, active document state
 * - list/   → Document discovery and organization
 * - upload/ → Document ingestion pipeline
 * - viewer/ → Document interaction surface
 * - shared/ → Cross-cutting components and utilities
 */

// Main Page
export { DocumentsPage } from "./DocumentsPage";

// Core - Types and state
export type {
  DocumentStatus,
  DocumentSector,
  EnhancedDocument,
  DocumentCoreState,
  ChunkMetadata,
  DocumentFilters,
} from "./core";

export {
  SECTOR_SUGGESTIONS,
  useDocumentStore,
  useActiveDocumentId,
  useActiveDocument,
  useDocumentActions,
  useSelectDocument,
} from "./core";

// List - Discovery and organization
export {
  DocumentListItem,
  DocumentGrid,
  DocumentTable,
  useDocuments,
  useListStore,
  type ViewMode,
} from "./list";

// Upload - Ingestion pipeline
export {
  UploadArea,
  UploadProgress,
  FileValidator,
  useDocumentUpload,
  useUploadStore,
  validateFile,
  validateFiles,
} from "./upload";

// Viewer - Interaction surface
export {
  DocumentViewer,
  useDocumentViewer,
  useViewerStore,
  type ViewerTheme,
} from "./viewer";

// Shared - Cross-cutting
export {
  DocumentStats,
  FilterBar,
  processChunks,
  getChunkMetadata,
} from "./shared";
