/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageRole } from './MessageRole';
/**
 * Chat message response.
 */
export type ChatMessageResponse = {
    id: number;
    session_id: number;
    role: MessageRole;
    content: string;
    tokens: number;
    model_used: (string | null);
    function_calls?: (Record<string, any> | null);
    grounding_sources?: (Record<string, any> | null);
    created_at: string;
};

