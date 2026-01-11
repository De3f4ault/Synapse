/**
 * Documents Module - Core Types
 *
 * Canonical domain types for the Document processing engine.
 */

import type { DocumentResponse, ProcessingStatusResponse } from "@/api/generated";

// Re-export API types
export type { DocumentResponse, ProcessingStatusResponse };

// ============================================================================
// Identifiers
// ============================================================================

export type DocumentId = number;
export type ChunkId = number;

// ============================================================================
// Enums (aligned with backend)
// ============================================================================

export enum DocumentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
}

export enum DocumentFormat {
    PDF = "pdf",
    DOCX = "docx",
    TXT = "txt",
    MD = "md",
    EPUB = "epub",
}

// ============================================================================
// Augmented Types (for UI)
// ============================================================================

export interface EnhancedDocument extends DocumentResponse {
    sector: string;
    type: string; // extension (pdf, docx, etc.)
    size: string; // formatted size string
    filename: string; // explicitly declare filename exists (from DocumentResponse)

    // Processing status
    status?: string; // "uploading" | "processing" | "indexed" | "ready" | "error" | "archived"
    ocr_performed?: boolean;

    // Productivity fields
    notes?: string | null;
    ai_summary?: string | null;
    reading_progress?: number | null;
    content_text?: string | null;
    thumbnail_url?: string | null;
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export interface UploadOptions {
    onProgress?: (progress: UploadProgress) => void;
    onComplete?: (document: DocumentResponse) => void;
    onError?: (error: DocumentError) => void;
}

// ============================================================================
// Processing Types
// ============================================================================

export interface ProcessingProgress {
    status: DocumentStatus;
    currentStep: string | null;
    percentage: number;
    error: string | null;
}

export interface ChunkData {
    id: ChunkId;
    content: string;
    metadata: Record<string, unknown>;
    order: number;
}

// ============================================================================
// View Types
// ============================================================================

export type ViewerMode = "content" | "chunks" | "metadata";

export interface ViewerState {
    mode: ViewerMode;
    selectedChunkId: ChunkId | null;
    searchQuery: string;
}

// ============================================================================
// Error Taxonomy
// ============================================================================

/**
 * Domain-specific error codes for document operations.
 */
export type DocumentErrorCode =
    | "DOCUMENT_NOT_FOUND"
    | "UPLOAD_FAILED"
    | "PROCESSING_FAILED"
    | "DUPLICATE_DOCUMENT"
    | "INVALID_FORMAT"
    | "FILE_TOO_LARGE"
    | "CHUNK_NOT_FOUND"
    | "PERMISSION_DENIED"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";

/**
 * Structured error for document operations.
 */
export interface DocumentError {
    code: DocumentErrorCode;
    message: string;
    recoverable: boolean;
    details?: unknown;
}

/**
 * Create a structured document error.
 */
export function createDocumentError(
    code: DocumentErrorCode,
    message: string,
    recoverable = true,
    details?: unknown
): DocumentError {
    return { code, message, recoverable, details };
}
