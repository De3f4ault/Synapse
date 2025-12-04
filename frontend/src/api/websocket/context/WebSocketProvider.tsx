<<<<<<< HEAD
/**
 * WebSocketProvider - React Context for WebSocket Manager
 * UPDATED: Now connects to /ws/unified endpoint
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getWebSocketManager } from '../manager';
import type { ConnectionState } from '../types';

interface WebSocketContextValue {
    manager: ReturnType<typeof getWebSocketManager>;
    isConnected: boolean;
    connectionState: ConnectionState;
    reconnect: () => void;
=======
// WebSocket Context Provider
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { WebSocketManager, getWebSocketManager } from '../manager';
import { useAuthStore } from '@/stores/authStore';
import type { ConnectionState } from '../types';

interface WebSocketContextValue {
    // State
    connectionState: ConnectionState;
    isConnected: boolean;
    error: Error | null;

    // Manager access
    manager: WebSocketManager | null;

    // Actions
    reconnect: () => void;
    disconnect: () => void;
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

<<<<<<< HEAD
export const useWebSocketContext = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocketContext must be used within WebSocketProvider');
    }
    return context;
};

interface WebSocketProviderProps {
    children: React.ReactNode;
    autoConnect?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
    children,
    autoConnect = true,
}) => {
    const manager = getWebSocketManager();
    const [connectionState, setConnectionState] = useState<ConnectionState>(
        manager.getConnectionState()
    );

    useEffect(() => {
        // Subscribe to connection state changes
        const unsubscribe = manager.onStateChange((state) => {
            setConnectionState(state);
        });

        // Auto-connect if enabled
        if (autoConnect && !manager.isConnected()) {
            console.log('[WebSocketProvider] Auto-connecting to unified endpoint...');
            manager.connect();
        }

        return () => {
            unsubscribe();
        };
    }, [manager, autoConnect]);

    const reconnect = () => {
        console.log('[WebSocketProvider] Manual reconnect requested');
        manager.reconnect();
    };

    const value: WebSocketContextValue = {
        manager,
        isConnected: connectionState === 'connected',
        connectionState,
        reconnect,
=======
interface WebSocketProviderProps {
    children: ReactNode;
}

/**
 * WebSocketProvider - App-level provider for WebSocket state and manager
 *
 * Lifecycle:
 * - On Mount: Initialize WebSocketManager singleton, connect to WebSocket
 * - On Unmount: Disconnect WebSocket, clear subscriptions
 * - On Token Change: Reconnect with new token
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
    const [manager] = useState<WebSocketManager>(() => getWebSocketManager());
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [error, setError] = useState<Error | null>(null);

    const { token, isAuthenticated } = useAuthStore();

    // Update connection state from manager
    useEffect(() => {
        const unsubscribe = manager.onStateChange((state) => {
            setConnectionState(state);

            if (state === 'error') {
                setError(new Error('WebSocket connection error'));
            } else {
                setError(null);
            }
        });

        return unsubscribe;
    }, [manager]);

    // Connect/disconnect based on authentication
    useEffect(() => {
        if (isAuthenticated && token) {
            console.log('[WebSocket Provider] Authenticated, connecting...');
            manager.connect();
        } else {
            console.log('[WebSocket Provider] Not authenticated, disconnecting...');
            manager.disconnect();
        }

        // Cleanup on unmount
        return () => {
            console.log('[WebSocket Provider] Unmounting, disconnecting...');
            manager.disconnect();
        };
    }, [isAuthenticated, token, manager]);

    // Reconnect when token changes (token refresh)
    useEffect(() => {
        if (isAuthenticated && token && connectionState === 'connected') {
            console.log('[WebSocket Provider] Token changed, reconnecting...');
            manager.reconnect();
        }
    }, [token]); // Only watch token changes, not connectionState to avoid loop

    const reconnect = useCallback(() => {
        manager.reconnect();
    }, [manager]);

    const disconnect = useCallback(() => {
        manager.disconnect();
    }, [manager]);

    const value: WebSocketContextValue = {
        connectionState,
        isConnected: connectionState === 'connected',
        error,
        manager,
        reconnect,
        disconnect,
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
    };

    return (
        <WebSocketContext.Provider value={value}>
        {children}
        </WebSocketContext.Provider>
    );
<<<<<<< HEAD
};
=======
}

/**
 * Hook to access WebSocket context
 */
export function useWebSocketContext(): WebSocketContextValue {
    const context = useContext(WebSocketContext);

    if (!context) {
        throw new Error('useWebSocketContext must be used within WebSocketProvider');
    }

    return context;
}
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
