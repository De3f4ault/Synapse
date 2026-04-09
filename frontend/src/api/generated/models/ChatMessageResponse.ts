/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Chat message response schema.
 */
export type ChatMessageResponse = {
    /**
     * Message ID
     */
    id: number;
    /**
     * Session ID
     */
    session_id: number;
    /**
     * Message role (user, assistant, system)
     */
    role: string;
    /**
     * Message content
     */
    content: string;
    /**
     * Tokens in message
     */
    tokens: number;
    /**
     * AI model used (for assistant messages)
     */
    model_used?: (string | null);
    /**
     * Function calls made
     */
    function_calls?: (Record<string, any> | null);
    /**
     * Grounding sources
     */
    grounding_sources?: (Record<string, any> | null);
    /**
     * Attached files [{document_id, filename, content_type, size_bytes}]
     */
    attachments?: null;
    /**
     * Message time
     */
    created_at: string;
    /**
     * Parent message ID (for branched messages)
     */
    parent_message_id?: (number | null);
    /**
     * Message version (increments on edit/regenerate)
     */
    version?: number;
    /**
     * Whether message is on active branch
     */
    is_active?: boolean;
    /**
     * Whether message has child messages
     */
    has_children?: boolean;
};

