import type { DocumentResponse } from '@/api/generated';

/**
 * Extended document type with UI-specific fields
 */
export interface EnhancedDocument extends DocumentResponse {
    sector: string;
    type: string;
    size: string;
}

/**
 * View mode for document display
 */
export type ViewMode = 'grid' | 'list';

/**
 * Document sector categories
 */
export type DocumentSector = 'All' | 'Classified' | 'Dev' | 'Assets' | 'System' | 'Logs';

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
    type?: 'info' | 'success' | 'error' | 'warning';
}
