// Documents Module - Public API
// Only export through this barrel file to maintain module isolation

// Core (types, lifecycle, events, constants)
export * from "./core";

// Components
export { ChunkExplorer } from "./components/ChunkExplorer";
export { DocumentUploader } from "./components/DocumentUploader";
export {
  DocumentViewer,
  DocumentViewerSkeleton,
} from "./components/DocumentViewer";
export {
  ProcessingStatus,
  ProcessingStatusBadge,
} from "./components/ProcessingStatus";
export { DocumentsHub } from "./components/DocumentsHub";

// Hooks
export {
  useDocumentUpload,
  useProcessingStatus,
} from "./hooks/useDocumentUpload";
