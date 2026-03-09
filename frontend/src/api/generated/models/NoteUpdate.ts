/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NoteFormat } from './NoteFormat';
/**
 * Note update schema.
 */
export type NoteUpdate = {
    /**
     * Note title
     */
    title?: (string | null);
    /**
     * Note content (string or BlockSuite JSONB)
     */
    content?: (string | Record<string, any> | null);
    /**
     * Content format
     */
    format?: (NoteFormat | null);
    /**
     * Parent note ID
     */
    parent_id?: (number | null);
    /**
     * Tag names
     */
    tags?: (Array<string> | null);
    /**
     * Favorite flag
     */
    is_favorite?: (boolean | null);
    /**
     * Archive flag
     */
    is_archived?: (boolean | null);
    /**
     * Journal date YYYY-MM-DD
     */
    journal_date?: (string | null);
};

