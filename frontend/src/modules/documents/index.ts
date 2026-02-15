// Documents Module - Public API
// Only export through this barrel file to maintain module isolation

// Core (types, lifecycle, events, constants)
export * from "./core";

// Components — New architecture (v2)
export { Sidebar } from "./components/Sidebar";
export { Breadcrumbs } from "./components/Breadcrumbs";
export { Toolbar } from "./components/Toolbar";
export { FileGrid } from "./components/FileGrid";
export { FileList } from "./components/FileList";
export { FileCard } from "./components/FileCard";
export { FolderCardNew } from "./components/FolderCardNew";
export { ContextMenu } from "./components/ContextMenu";

// Components — Preserved from v1
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
