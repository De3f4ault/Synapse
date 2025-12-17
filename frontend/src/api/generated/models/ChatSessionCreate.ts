/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Chat session creation.
 */
export type ChatSessionCreate = {
    /**
     * Custom session title
     */
    title?: (string | null);
    /**
     * Optional document for context
     */
    document_id?: (number | null);
    /**
     * Modules to include in context building
     */
    context_modules?: (Array<string> | null);
};

