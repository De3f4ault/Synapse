/**
 * Custom Types and Interfaces
 *
 * Re-export generated types and add custom app types.
 */

// Re-export all generated types
export * from '@/api/generated/types.gen';

// Custom route params
export interface RouteParams {
    deckId?: string;
    noteId?: string;
    documentId?: string;
    quizId?: string;
    sessionId?: string;
}

// Custom error type
export interface AppError {
    message: string;
    code?: string;
    details?: unknown;
}

// Pagination metadata
export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
