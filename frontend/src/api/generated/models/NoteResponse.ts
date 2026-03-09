/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Note response schema.
 */
export type NoteResponse = {
    /**
     * Note title
     */
    title: string;
    /**
     * Note content (string or BlockSuite JSONB)
     */
    content: (string | Record<string, any>);
    /**
     * Content format
     */
    format?: string;
    /**
     * Note ID
     */
    id: number;
    /**
     * Owner user ID
     */
    user_id: number;
    /**
     * Parent note ID
     */
    parent_id?: (number | null);
    /**
     * Embedding vector ID
     */
    embedding_id?: (string | null);
    /**
     * YYYY-MM-DD if journal entry
     */
    journal_date?: (string | null);
    /**
     * Favorite flag
     */
    is_favorite?: boolean;
    /**
     * Archive flag
     */
    is_archived?: boolean;
    /**
     * Number of child notes
     */
    children_count?: number;
    /**
     * Creation time
     */
    created_at: string;
    /**
     * Last update time
     */
    updated_at: string;
};

