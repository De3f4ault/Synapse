/**
 * Chat Engine Types
 *
 * INVARIANT:
 * These types are pure data structures.
 * No React, no DOM, no side-effects.
 */

import type { EntityIdentity } from "@/shared/core/entity";

/**
 * WebSocket connection states
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Streaming message state
 */
export interface StreamingState {
    isStreaming: boolean;
    content: string;
    thinking: string;
    model: string;
    sources: GroundingSource[];
}

/**
 * Grounding source from search
 */
export interface GroundingSource {
    title: string;
    url: string;
    snippet?: string;
}

/**
 * Tool call during streaming
 */
export interface ToolCall {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    status: 'pending' | 'executing' | 'complete' | 'error';
}

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Core message structure (matches backend ChatMessageResponse)
 */
export interface ChatMessage {
    id: number;
    session_id: number;
    role: MessageRole;
    content: string;
    tokens: number;
    model_used: string | null;
    function_calls: unknown | null;
    grounding_sources: GroundingSource[] | null;
    entities?: EntityIdentity[];
    created_at: string;
}

/**
 * Optimistic message (before server confirmation)
 */
export interface OptimisticMessage extends ChatMessage {
    isOptimistic: true;
}

/**
 * Default streaming state
 */
export const INITIAL_STREAMING_STATE: StreamingState = {
    isStreaming: false,
    content: '',
    thinking: '',
    model: '',
    sources: [],
};
