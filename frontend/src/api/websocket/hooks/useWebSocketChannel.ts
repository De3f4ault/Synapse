// useWebSocketChannel hook - Subscribe to all events from a channel
import { useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import type { MessageHandler } from "../types";

/**
 * Hook to subscribe to all events from a channel
 *
 * @param channel - Channel name (e.g., 'dashboard', 'chat')
 * @param handler - Handler function called with (eventType, data) for each event
 * @param dependencies - Optional dependency array (like useEffect)
 *
 * Usage:
 * ```tsx
 * useWebSocketChannel('chat', (event, data) => {
 *   switch(event) {
 *     case 'message': handleMessage(data); break;
 *     case 'typing': handleTyping(data); break;
 *   }
 * });
 * ```
 */
export function useWebSocketChannel<T = any>(
  channel: string,
  handler: (event: string, data: T) => void,
  dependencies: any[] = [],
): void {
  const { manager, isConnected } = useWebSocket();
  const handlerRef = useRef(handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!manager || !isConnected) {
      return;
    }

    // Create message handler that passes all events to the handler
    const messageHandler: MessageHandler = (message) => {
      const eventType = message.type || message.event || "unknown";
      const eventData = message.data || message;

      handlerRef.current(eventType, eventData);
    };

    // Subscribe to channel
    const unsubscribe = manager.subscribe(channel, messageHandler);

    console.log(`[useWebSocketChannel] Subscribed to channel: ${channel}`);

    // Cleanup
    return () => {
      unsubscribe();
      console.log(
        `[useWebSocketChannel] Unsubscribed from channel: ${channel}`,
      );
    };
  }, [manager, isConnected, channel, ...dependencies]);
}
