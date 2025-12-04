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
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

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
    };

    return (
        <WebSocketContext.Provider value={value}>
        {children}
        </WebSocketContext.Provider>
    );
};
