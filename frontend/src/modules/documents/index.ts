// Documents Module - Public API
// Only export through this barrel file to maintain module isolation

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

// Hooks
export {
  useDocumentUpload,
  useProcessingStatus,
} from "./hooks/useDocumentUpload";
