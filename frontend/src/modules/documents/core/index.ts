/**
 * Documents Module - Core Public API
 *
 * RULE: All imports from documents/core go through this file.
 */

// Types
export type {
    DocumentId,
    ChunkId,
    DocumentResponse,
    ProcessingStatusResponse,
    UploadProgress,
    UploadOptions,
    ProcessingProgress,
    ChunkData,
    ViewerMode,
    ViewerState,
    DocumentErrorCode,
    DocumentError,
} from "./types";
export { DocumentStatus, DocumentFormat, createDocumentError } from "./types";

// Lifecycle
export type { DocumentLifecycleState, DocumentLifecycle } from "./lifecycle";
export {
    canTransition,
    transition,
    createInitialLifecycle,
    isBusy,
    canUpload,
    canDelete,
    isProcessing,
} from "./lifecycle";

// Constants & Invariants
export {
    FILE_CONSTRAINTS,
    ACCEPTED_FORMATS,
    ACCEPTED_EXTENSIONS,
    PROCESSING,
    CHUNKING,
    isValidFileSize,
    isValidFileType,
    isValidFilename,
    getFileExtension,
} from "./constants";

// Events
export type { DocumentEventType, DocumentEventPayloads } from "./events";
export { onDocumentEvent, emitDocumentEvent } from "./events";
