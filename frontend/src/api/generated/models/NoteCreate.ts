/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Note creation schema.
 */
export type NoteCreate = {
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
     * Parent note ID for hierarchy
     */
    parent_id?: (number | null);
    /**
     * Tag names
     */
    tags?: Array<string>;
};

