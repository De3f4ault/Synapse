/**
 * Document Engine Types
 *
 * INVARIANT:
 * These types are pure data structures.
 * No React, no DOM, no side-effects.
 *
 * Core owns WHICH document is active.
 * Viewer owns HOW it's viewed (zoom, page, theme).
 */

import type { DocumentResponse } from "@/api/generated";

// ==================== LIFECYCLE ====================

/**
 * Document processing lifecycle states
 */
export type DocumentStatus =
    | "uploading"
    | "processing"
    | "indexed"
    | "ready"
    | "error"
    | "archived";

/**
 * Document lifecycle transition rules
 */
export const LIFECYCLE_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
    uploading: ["processing", "error"],
    processing: ["indexed", "error"],
    indexed: ["ready", "error"],
    ready: ["archived"],
    error: ["uploading"], // retry
    archived: ["ready"], // restore
};

// ==================== DOCUMENT TYPES ====================

/**
 * Sector classifications for documents
 */
export const SECTOR_SUGGESTIONS = [
    "Uncategorized",
    "Books",
    "Papers",
    "Notes",
    "Work",
    "Personal",
    "Reference",
] as const;

export type DocumentSector = (typeof SECTOR_SUGGESTIONS)[number] | string;

/**
 * Extended document type with UI-specific fields
 */
export interface EnhancedDocument extends DocumentResponse {
    sector: DocumentSector;
    type: string;
    size: string;
    // Processing status
    status?: DocumentStatus;
    ocr_performed?: boolean;
    // Productivity fields
    notes?: string | null;
    ai_summary?: string | null;
    reading_progress?: number | null;
    // Content fields
    content_text?: string | null;
    thumbnail_url?: string | null;
}

// ==================== CORE STATE ====================

/**
 * Core document state - single source of truth for active document
 */
export interface DocumentCoreState {
    activeDocumentId: number | null;
    activeDocument: EnhancedDocument | null;
    error: string | null;
}

/**
 * Initial core state
 */
export const INITIAL_CORE_STATE: DocumentCoreState = {
    activeDocumentId: null,
    activeDocument: null,
    error: null,
};

// ==================== METADATA ====================

/**
 * Chunk metadata for document processing
 */
export interface ChunkMetadata {
    id: number;
    content: string;
    embedding?: number[];
    metadata?: Record<string, unknown>;
}

/**
 * Document filter options
 */
export interface DocumentFilters {
    sector: DocumentSector | "All";
    search: string;
    status?: DocumentStatus;
}

/**
 * Default filters
 */
export const DEFAULT_FILTERS: DocumentFilters = {
    sector: "All",
    search: "",
};
