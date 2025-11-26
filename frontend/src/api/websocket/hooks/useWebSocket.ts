// useWebSocket hook - Access WebSocket manager and connection state
import { useWebSocketContext } from '../context/WebSocketProvider';

/**
 * Hook to access WebSocket manager and connection state
 *
 * Usage:
 * ```tsx
 * const { isConnected, manager, reconnect } = useWebSocket();
 * ```
 */
export function useWebSocket() {
    return useWebSocketContext();
}
