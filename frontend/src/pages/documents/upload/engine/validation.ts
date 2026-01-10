/**
 * File Validation Engine
 *
 * Pure functions for validating files before upload.
 * No side effects, no state mutation.
 */

/**
 * File validation result
 */
export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "txt",
    "md",
    "csv",
    "json",
    "xml",
];

/**
 * Allowed MIME types
 */
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/xml",
    "text/xml",
];

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Validate file size
 */
function validateFileSize(file: File): FileValidationResult {
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`,
        };
    }
    return { valid: true };
}

/**
 * Validate file extension
 */
function validateFileExtension(file: File): FileValidationResult {
    const extension = getFileExtension(file.name);

    if (!extension) {
        return {
            valid: false,
            error: "File has no extension",
        };
    }

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return {
            valid: false,
            error: `File type .${extension} is not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
        };
    }

    return { valid: true };
}

/**
 * Validate file MIME type
 */
function validateFileMimeType(file: File): FileValidationResult {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `MIME type ${file.type} is not supported`,
        };
    }
    return { valid: true };
}

/**
 * Validate file name
 */
function validateFileName(file: File): FileValidationResult {
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;

    if (invalidChars.test(file.name)) {
        return {
            valid: false,
            error: "Filename contains invalid characters",
        };
    }

    if (file.name.length > 255) {
        return {
            valid: false,
            error: "Filename is too long (max 255 characters)",
        };
    }

    return { valid: true };
}

/**
 * Validate a file for upload
 */
export function validateFile(file: File): FileValidationResult {
    // Run all validations
    const validations = [
        validateFileSize(file),
        validateFileExtension(file),
        validateFileMimeType(file),
        validateFileName(file),
    ];

    // Return first error found
    for (const result of validations) {
        if (!result.valid) {
            return result;
        }
    }

    return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(
    files: File[],
): Map<string, FileValidationResult> {
    const results = new Map<string, FileValidationResult>();

    for (const file of files) {
        results.set(file.name, validateFile(file));
    }

    return results;
}
