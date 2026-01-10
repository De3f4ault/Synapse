/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Chat session response schema.
 */
export type ChatSessionResponse = {
    /**
     * Session ID
     */
    id: number;
    /**
     * Owner user ID
     */
    user_id: number;
    /**
     * Session title
     */
    title: string;
    /**
     * Associated document ID
     */
    document_id?: (number | null);
    /**
     * Modules in context
     */
    context_modules: Array<string>;
    /**
     * Number of messages
     */
    message_count: number;
    /**
     * Total tokens used
     */
    total_tokens_used: number;
    /**
     * Total cost (estimated)
     */
    total_cost: number;
    /**
     * Creation time
     */
    created_at: string;
    /**
     * Last message time
     */
    updated_at: string;
};

