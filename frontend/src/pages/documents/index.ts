/**
 * Documents Module Exports
 * Central export point for all documents-related functionality
 */

// Main Page
export { DocumentsPage } from './DocumentsPage';

// List Components
export { DocumentCard } from './components/list/DocumentCard';
export { DocumentGrid } from './components/list/DocumentGrid';
export { DocumentTable } from './components/list/DocumentTable';

// Upload Components
export { UploadArea } from './components/upload/UploadArea';
export { UploadProgress } from './components/upload/UploadProgress';
export { FileValidator } from './components/upload/FileValidator';

// Viewer Components
export { DocumentViewer } from './components/viewer/DocumentViewer';
export { ChunkExplorer } from './components/viewer/ChunkExplorer';
export { ProcessingStatus } from './components/viewer/ProcessingStatus';

// Shared Components
export { DocumentStats } from './components/shared/DocumentStats';
export { FilterBar } from './components/shared/FilterBar';

// Hooks
export { useDocuments } from './hooks/useDocuments';
export { useDocumentUpload } from './hooks/useDocumentUpload';
export { useDocumentViewer } from './hooks/useDocumentViewer';

// Utils
export { validateFile, getFileExtension, formatFileSize } from './utils/fileValidation';
export { processChunks, getChunkMetadata } from './utils/chunkProcessing';

// Types
export type * from './types/documents.types';
