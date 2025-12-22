// useWebSocketEvent hook - Subscribe to specific events from a channel
import { useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import type { MessageHandler } from "../types";

/**
 * Hook to subscribe to specific events from a channel
 *
 * @param channel - Channel name (e.g., 'dashboard', 'chat')
 * @param eventType - Event type to listen for (e.g., 'card_reviewed', 'note_updated')
 * @param handler - Handler function called when event is received
 * @param dependencies - Optional dependency array (like useEffect)
 *
 * Usage:
 * ```tsx
 * useWebSocketEvent('dashboard', 'card_reviewed', (data) => {
 *   queryClient.invalidateQueries(['cards', 'due']);
 * });
 * ```
 */
export function useWebSocketEvent<T = any>(
  channel: string,
  eventType: string,
  handler: (data: T) => void,
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

    // Create wrapper that filters by event type
    const messageHandler: MessageHandler = (message) => {
      // Check if this message matches the event type we're interested in
      if (message.type === eventType || message.event === eventType) {
        handlerRef.current(message.data || message);
      }
    };

    // Subscribe to channel
    const unsubscribe = manager.subscribe(channel, messageHandler);

    console.log(`[useWebSocketEvent] Subscribed to ${channel}:${eventType}`);

    // Cleanup
    return () => {
      unsubscribe();
      console.log(
        `[useWebSocketEvent] Unsubscribed from ${channel}:${eventType}`,
      );
    };
  }, [manager, isConnected, channel, eventType, ...dependencies]);
}
