/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Chat session creation schema.
 */
export type ChatSessionCreate = {
    /**
     * Session title (auto-generated if not provided)
     */
    title?: (string | null);
    /**
     * Document ID to chat about
     */
    document_id?: (number | null);
    /**
     * Modules to include in context
     */
    context_modules?: Array<string>;
};

