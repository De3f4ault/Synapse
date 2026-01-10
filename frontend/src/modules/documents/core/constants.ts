/**
 * Documents Module - Constants & Invariants
 *
 * Business rules and configuration for document operations.
 */

// ============================================================================
// File Constraints
// ============================================================================

export const FILE_CONSTRAINTS = {
    /** Maximum file size in bytes (50MB) */
    MAX_FILE_SIZE: 50 * 1024 * 1024,

    /** Minimum file size in bytes */
    MIN_FILE_SIZE: 1,

    /** Maximum filename length */
    MAX_FILENAME_LENGTH: 255,
} as const;

// ============================================================================
// Accepted Formats
// ============================================================================

export const ACCEPTED_FORMATS = {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "application/epub+zip": [".epub"],
} as const;

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".epub"] as const;

// ============================================================================
// Processing
// ============================================================================

export const PROCESSING = {
    /** Polling interval for status checks (ms) */
    STATUS_POLL_INTERVAL: 3000,

    /** Maximum polling duration before timeout (ms) */
    MAX_POLL_DURATION: 10 * 60 * 1000, // 10 minutes

    /** Retry count for failed uploads */
    UPLOAD_RETRY_COUNT: 3,

    /** Delay between retries (ms) */
    UPLOAD_RETRY_DELAY: 1000,
} as const;

// ============================================================================
// Chunking
// ============================================================================

export const CHUNKING = {
    /** Target chunk size in characters */
    TARGET_CHUNK_SIZE: 1000,

    /** Overlap between chunks */
    CHUNK_OVERLAP: 200,

    /** Minimum chunk size */
    MIN_CHUNK_SIZE: 100,

    /** Maximum chunks to display at once */
    MAX_DISPLAY_CHUNKS: 50,
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

export function isValidFileSize(size: number): boolean {
    return size >= FILE_CONSTRAINTS.MIN_FILE_SIZE && size <= FILE_CONSTRAINTS.MAX_FILE_SIZE;
}

export function isValidFileType(mimeType: string): boolean {
    return Object.keys(ACCEPTED_FORMATS).includes(mimeType);
}

export function isValidFilename(filename: string): boolean {
    return (
        filename.length > 0 &&
        filename.length <= FILE_CONSTRAINTS.MAX_FILENAME_LENGTH &&
        ACCEPTED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext))
    );
}

export function getFileExtension(filename: string): string | null {
    const match = filename.match(/\.[a-z0-9]+$/i);
    return match ? match[0].toLowerCase() : null;
}
