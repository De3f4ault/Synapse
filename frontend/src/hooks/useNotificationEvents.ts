/**
 * useNotificationEvents Hook
 *
 * Listens for real-time notification events from the WebSocket
 * and updates the notification store.
 *
 * Should be mounted once at the app level (e.g., in App.tsx).
 */

import { useEffect, useRef } from "react";
import { useWebSocket } from "@/api/websocket/hooks/useWebSocket";
import { useNotificationStore } from "@/stores/notificationStore";

export function useNotificationEvents() {
  const { manager, isConnected } = useWebSocket();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const hasSubscribed = useRef(false);

  useEffect(() => {
    if (!manager || !isConnected || hasSubscribed.current) return;

    hasSubscribed.current = true;

    // Subscribe to dashboard channel for notifications
    const unsubscribe = manager.subscribe("dashboard", (message) => {
      // Handle notification events
      if (message.event === "notification" || message.type === "notification") {
        const data = message.data;
        if (data) {
          console.log("[NotificationEvents] New notification:", data);
          addNotification({
            type: data.type || "info",
            title: data.title || "Notification",
            message: data.message || "",
            action: data.action_url
              ? { label: data.action_label || "View", href: data.action_url }
              : undefined,
          });
        }
      }

      // Handle batch notification events (from Focus Mode flush)
      if (message.event === "notification_batch") {
        const data = message.data;
        if (data) {
          console.log("[NotificationEvents] Notification batch:", data);
          addNotification({
            type: "info",
            title: "Focus Session Complete",
            message: data.message || `You have ${data.count} new notifications.`,
          });
        }
      }
    });

    return () => {
      hasSubscribed.current = false;
      unsubscribe();
    };
  }, [manager, isConnected, addNotification]);
}
