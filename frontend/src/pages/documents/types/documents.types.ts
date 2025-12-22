import type { DocumentResponse } from "@/api/generated";

/**
 * Extended document type with UI-specific fields
 */
export interface EnhancedDocument extends DocumentResponse {
  sector: string;
  type: string;
  size: string;
  // OCR field
  ocr_performed?: boolean;
  // New productivity fields
  notes?: string | null;
  ai_summary?: string | null;
  reading_progress?: number | null;
  // Content fields
  content_text?: string | null;
}

/**
 * View mode for document display
 */
export type ViewMode = "grid" | "list";

/**
 * Default sector suggestions for document classification
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
 * Upload progress tracking
 */
export interface UploadProgress {
  [filename: string]: number;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  id: number;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

/**
 * Document filter options
 */
export interface DocumentFilters {
  sector: DocumentSector;
  search: string;
  status?: string;
}

/**
 * System log entry
 */
export interface SystemLogEntry {
  timestamp: Date;
  message: string;
  type?: "info" | "success" | "error" | "warning";
}
