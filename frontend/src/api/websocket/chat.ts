// Chat WebSocket client
import { getAuthToken } from '../client';
import type {
    ChatWSMessage,
    ChatClientMessage,
    WebSocketOptions,
    WebSocketState,
} from './types';

/**
 * Chat WebSocket client for real-time streaming messages
 */
export class ChatWebSocketClient {
    private ws: WebSocket | null = null;
    private sessionId: number;
    private url: string;
    private options: Required<WebSocketOptions>;
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private messageHandlers: Set<(message: ChatWSMessage) => void> = new Set();
    private stateHandlers: Set<(state: WebSocketState) => void> = new Set();

    constructor(sessionId: number, options: WebSocketOptions = {}) {
        this.sessionId = sessionId;

        // Get WebSocket URL from environment
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
        const token = getAuthToken();

        this.url = `${wsUrl}/ws/chat/${sessionId}?token=${token}`;

        this.options = {
            autoReconnect: options.autoReconnect ?? true,
            reconnectDelay: options.reconnectDelay ?? 3000,
            maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
            connectionTimeout: options.connectionTimeout ?? 10000,
        };
    }

    /**
     * Connect to WebSocket
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.updateState('connecting');

        try {
            this.ws = new WebSocket(this.url);

            // Connection opened
            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.updateState('connected');
            };

            // Listen for messages
            this.ws.onmessage = (event) => {
                try {
                    const message: ChatWSMessage = JSON.parse(event.data);
                    this.notifyMessageHandlers(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            // Connection closed
            this.ws.onclose = () => {
                this.updateState('disconnected');
                this.ws = null;

                // Auto-reconnect if enabled
                if (
                    this.options.autoReconnect &&
                    this.reconnectAttempts < this.options.maxReconnectAttempts
                ) {
                    this.reconnectTimer = setTimeout(() => {
                        this.reconnectAttempts++;
                        this.connect();
                    }, this.options.reconnectDelay);
                }
            };

            // Connection error
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateState('error');
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.updateState('error');
        }
    }

    /**
     * Send a message
     */
    sendMessage(content: string): void {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        const message: ChatClientMessage = {
            type: 'message',
            content,
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Subscribe to messages
     */
    onMessage(handler: (message: ChatWSMessage) => void): () => void {
        this.messageHandlers.add(handler);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    /**
     * Subscribe to connection state changes
     */
    onStateChange(handler: (state: WebSocketState) => void): () => void {
        this.stateHandlers.add(handler);

        // Return unsubscribe function
        return () => {
            this.stateHandlers.delete(handler);
        };
    }

    /**
     * Disconnect and cleanup
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.messageHandlers.clear();
        this.stateHandlers.clear();
    }

    /**
     * Get current connection state
     */
    getState(): WebSocketState {
        if (!this.ws) return 'disconnected';

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CLOSING:
            case WebSocket.CLOSED:
                return 'disconnected';
            default:
                return 'error';
        }
    }

    private updateState(state: WebSocketState): void {
        this.stateHandlers.forEach((handler) => handler(state));
    }

    private notifyMessageHandlers(message: ChatWSMessage): void {
        this.messageHandlers.forEach((handler) => handler(message));
    }
}
