// WebSocket Manager - Centralized WebSocket connection management
import { getAuthToken } from '../client';
import { WS_BASE_URL } from '@/lib/constants';
import type {
    WebSocketMessage,
    ConnectionState,
    MessageHandler,
    UnsubscribeFn,
} from './types';

/**
 * WebSocketManager - Singleton class managing all WebSocket connections
 *
 * Responsibilities:
 * - Maintain single WebSocket connection per user
 * - Handle authentication and token refresh
 * - Route incoming messages to subscribers
 * - Implement exponential backoff reconnection
 * - Send heartbeat/ping-pong
 * - Manage subscription registry
 */
export class WebSocketManager {
    private static instance: WebSocketManager | null = null;

    private ws: WebSocket | null = null;
    private connectionState: ConnectionState = 'disconnected';
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;

    // Subscription management
    private subscriptions = new Map<string, Set<MessageHandler>>();
    private stateHandlers = new Set<(state: ConnectionState) => void>();
    private nextSubscriptionId = 0;

    // Configuration
    private readonly maxReconnectAttempts = 5;
    private readonly reconnectBaseDelay = 1000;
    private readonly heartbeatInterval = 30000; // 30 seconds
    private readonly connectionTimeout = 10000;

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get singleton instance
     */
    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    /**
     * Connect to WebSocket server
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[WS Manager] Already connected');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            console.warn('[WS Manager] No auth token available');
            this.updateState('error');
            return;
        }

        this.updateState('connecting');

        try {
            const wsUrl = `${WS_BASE_URL}/ws/dashboard?token=${token}`;
            console.log('[WS Manager] Connecting to:', wsUrl);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[WS Manager] Connected');
                this.reconnectAttempts = 0;
                this.updateState('connected');
                this.startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[WS Manager] Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WS Manager] Error:', error);
                this.updateState('error');
            };

            this.ws.onclose = (event) => {
                console.log('[WS Manager] Disconnected:', event.code, event.reason);
                this.updateState('disconnected');
                this.stopHeartbeat();
                this.ws = null;

                // Attempt reconnection with exponential backoff
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                } else {
                    console.error('[WS Manager] Max reconnect attempts reached');
                    this.updateState('error');
                }
            };
        } catch (error) {
            console.error('[WS Manager] Connection failed:', error);
            this.updateState('error');
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        console.log('[WS Manager] Disconnecting...');

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.updateState('disconnected');
    }

    /**
     * Manually trigger reconnection
     */
    reconnect(): void {
        console.log('[WS Manager] Manual reconnect triggered');
        this.disconnect();
        this.reconnectAttempts = 0;
        this.connect();
    }

    /**
     * Subscribe to messages from a specific channel
     */
    subscribe(channel: string, handler: MessageHandler): UnsubscribeFn {
        const subscriptionId = `${channel}_${this.nextSubscriptionId++}`;

        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }

        this.subscriptions.get(channel)!.add(handler);

        console.log('[WS Manager] Subscribed to channel:', channel, 'ID:', subscriptionId);

        // Return unsubscribe function
        return () => {
            const handlers = this.subscriptions.get(channel);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.subscriptions.delete(channel);
                }
            }
            console.log('[WS Manager] Unsubscribed from channel:', channel, 'ID:', subscriptionId);
        };
    }

    /**
     * Subscribe to connection state changes
     */
    onStateChange(handler: (state: ConnectionState) => void): UnsubscribeFn {
        this.stateHandlers.add(handler);

        // Immediately call with current state
        handler(this.connectionState);

        return () => {
            this.stateHandlers.delete(handler);
        };
    }

    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Send a message to the server
     */
    send(message: any): void {
        if (!this.isConnected()) {
            console.warn('[WS Manager] Cannot send - not connected');
            return;
        }

        try {
            this.ws!.send(JSON.stringify(message));
        } catch (error) {
            console.error('[WS Manager] Failed to send message:', error);
        }
    }

    // ==================== PRIVATE METHODS ====================

    private handleMessage(message: any): void {
        // Handle system messages
        if (message.type === 'connected') {
            console.log('[WS Manager] Connection confirmed:', message);
            return;
        }

        if (message.type === 'pong') {
            console.log('[WS Manager] Heartbeat pong received');
            return;
        }

        if (message.type === 'ping') {
            // Respond to server ping
            this.send({ type: 'pong' });
            return;
        }

        // Route to subscribers
        this.routeToSubscribers(message);
    }

    private routeToSubscribers(message: any): void {
        // Determine channel from message
        // Assuming dashboard events come without explicit channel
        // If backend sends { type: 'card_reviewed', data: {...} }
        const channel = 'dashboard'; // Default channel for now

        const handlers = this.subscriptions.get(channel);

        if (handlers && handlers.size > 0) {
            console.log('[WS Manager] Routing message to', handlers.size, 'subscribers');
            handlers.forEach(handler => {
                try {
                    handler(message);
                } catch (error) {
                    console.error('[WS Manager] Handler error:', error);
                }
            });
        } else {
            console.log('[WS Manager] No subscribers for channel:', channel);
        }
    }

    private updateState(state: ConnectionState): void {
        if (this.connectionState === state) return;

        console.log('[WS Manager] State change:', this.connectionState, '->', state);
        this.connectionState = state;

        // Notify all state handlers
        this.stateHandlers.forEach(handler => {
            try {
                handler(state);
            } catch (error) {
                console.error('[WS Manager] State handler error:', error);
            }
        });
    }

    private scheduleReconnect(): void {
        const delay = Math.min(
            this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
                               30000
        );

        console.log(
            `[WS Manager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
        );

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected()) {
                console.log('[WS Manager] Sending heartbeat ping');
                this.send({ type: 'ping' });
            }
        }, this.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
}

// Export singleton getter
export const getWebSocketManager = () => WebSocketManager.getInstance();
