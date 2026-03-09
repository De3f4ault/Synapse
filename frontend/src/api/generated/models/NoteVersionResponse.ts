/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Note version response schema.
 */
export type NoteVersionResponse = {
    /**
     * Version ID
     */
    id: number;
    /**
     * Parent note ID
     */
    note_id: number;
    /**
     * Version number
     */
    version_number: number;
    /**
     * Note title at this version
     */
    title: string;
    /**
     * Version creation time
     */
    created_at: string;
    /**
     * User who created this version
     */
    created_by: number;
};

