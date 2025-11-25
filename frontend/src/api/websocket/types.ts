// src/api/websocket/types.ts   // WebSocket message types

/**
 * WebSocket connection states
 *
 * Changed from enum to string union type for compatibility with string literals used across the codebase.
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Chat WebSocket message types
 */
export type ChatWSMessage =
| {
    type: 'connected';
    session_id: number;
}
| {
    type: 'message';
    role: 'assistant' | 'user' | 'system';
    content: string;
    streaming: boolean;
}
| {
    type: 'error';
    message: string;
};

/**
 * Chat client message types (outgoing)
 */
export type ChatClientMessage = {
    type: 'message';
    content: string;
};

/**
 * Study WebSocket message types (for future real-time study sessions)
 */
export type StudyWSMessage =
| {
    type: 'connected';
    session_id: number;
}
| {
    type: 'item_update';
    item_id: number;
    item_type: string;
    data: Record<string, unknown>;
}
| {
    type: 'session_update';
    session_id: number;
    items_completed: number;
    items_correct: number;
}
| {
    type: 'error';
    message: string;
};

/**
 * Study client message types (outgoing)
 */
export type StudyClientMessage =
| {
    type: 'item_completed';
    item_id: number;
    correct: boolean;
    time_taken_ms: number;
}
| {
    type: 'session_pause';
}
| {
    type: 'session_resume';
};

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
    /**
     * Auto-reconnect on disconnect
     */
    autoReconnect?: boolean;
    /**
     * Reconnect delay in milliseconds
     */
    reconnectDelay?: number;
    /**
     * Maximum reconnect attempts
     */
    maxReconnectAttempts?: number;
    /**
     * Connection timeout in milliseconds
     */
    connectionTimeout?: number;
}
