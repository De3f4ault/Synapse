/**
 * Document Upload Module - Public API
 *
 * This is the ONLY entry point for the upload module.
 * No deep imports across modules allowed.
 *
 * Upload owns:
 * - File validation
 * - Upload queue management (FSM-based)
 * - Upload UI components
 *
 * Upload does NOT own:
 * - Active document state (that's core)
 * - Document list state (that's list)
 */

// Components
export {
    UploadArea,
    UploadProgress,
    FileValidator,
    DuplicateConflictModal,
    UploadQueueItem,
    UploadQueueBar,
} from "./components";

// Engine
export {
    validateFile,
    validateFiles,
    getFileExtension,
    formatFileSize,
    type FileValidationResult,
} from "./engine";

// Hooks
export { useDocumentUpload } from "./hooks";
export { useUploadQueue } from "./hooks";

// State
export {
    useUploadStore,
    type UploadProgress as UploadProgressState,
    type UploadItem,
    type UploadStatus,
    type ConflictInfo,
} from "./state";

