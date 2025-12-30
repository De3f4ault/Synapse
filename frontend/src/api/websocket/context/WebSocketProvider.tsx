// WebSocket Context Provider
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { WebSocketManager, getWebSocketManager } from "../manager";
import { useAuthStore } from "@/stores/authStore";
import type { ConnectionState } from "../types";

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
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

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
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<Error | null>(null);

  const { token, isAuthenticated } = useAuthStore();

  // Update connection state from manager
  useEffect(() => {
    const unsubscribe = manager.onStateChange((state) => {
      setConnectionState(state);

      if (state === "error") {
        setError(new Error("WebSocket connection error"));
      } else {
        setError(null);
      }
    });

    return unsubscribe;
  }, [manager]);

  // Connect/disconnect based on authentication
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log("[WebSocket Provider] Authenticated, connecting...");
      manager.connect();
    } else {
      console.log("[WebSocket Provider] Not authenticated, disconnecting...");
      manager.disconnect();
    }

    // Cleanup on unmount
    return () => {
      console.log("[WebSocket Provider] Unmounting, disconnecting...");
      manager.disconnect();
    };
  }, [isAuthenticated, token, manager]);

  // Token refresh handling is now done in the first useEffect
  // Removed separate token-change effect that caused duplicate reconnections

  const reconnect = useCallback(() => {
    manager.reconnect();
  }, [manager]);

  const disconnect = useCallback(() => {
    manager.disconnect();
  }, [manager]);

  const value: WebSocketContextValue = {
    connectionState,
    isConnected: connectionState === "connected",
    error,
    manager,
    reconnect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to access WebSocket context
 */
export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within WebSocketProvider",
    );
  }

  return context;
}
