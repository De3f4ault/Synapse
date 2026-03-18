/**
 * useTaskProgress — WebSocket listener for document processing events
 *
 * Listens to Synapse's existing ProgressManager WebSocket for:
 * - new_document, processing, consumption_finished, consumption_failed
 * Maintains a reactive list of active/completed tasks.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// Types
// ============================================================================

export interface TaskEvent {
  id: string;
  type: "new_document" | "processing" | "consumption_finished" | "consumption_failed" | "document_deleted";
  documentId?: number;
  documentTitle?: string;
  status: "running" | "completed" | "failed";
  progress?: number; // 0-100
  currentStep?: string;
  timestamp: string;
  error?: string;
}

interface UseTaskProgressOptions {
  /** WebSocket URL — defaults to ws://localhost:8000/ws/progress */
  wsUrl?: string;
  /** Max events to keep in memory */
  maxEvents?: number;
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useTaskProgress({
  wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/progress`,
  maxEvents = 50,
  autoConnect = true,
}: UseTaskProgressOptions = {}) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const addEvent = useCallback(
    (event: TaskEvent) => {
      setEvents((prev) => {
        // Update existing event for same document or add new
        const existing = prev.findIndex(
          (e) => e.documentId === event.documentId && e.status === "running"
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = event;
          return updated;
        }
        return [event, ...prev].slice(0, maxEvents);
      });
    },
    [maxEvents]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          const event: TaskEvent = {
            id: data.task_id || data.id || crypto.randomUUID(),
            type: data.type || "processing",
            documentId: data.document_id,
            documentTitle: data.document_title || data.filename,
            status:
              data.type === "consumption_finished"
                ? "completed"
                : data.type === "consumption_failed"
                ? "failed"
                : "running",
            progress: data.progress,
            currentStep: data.current_step || data.step,
            timestamp: new Date().toISOString(),
            error: data.error,
          };
          addEvent(event);
        } catch {
          // Ignore unparseable messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket construction failed
      setConnected(false);
    }
  }, [wsUrl, addEvent]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  // Derived state
  const activeTasks = events.filter((e) => e.status === "running");
  const completedTasks = events.filter((e) => e.status === "completed");
  const failedTasks = events.filter((e) => e.status === "failed");

  return {
    events,
    activeTasks,
    completedTasks,
    failedTasks,
    connected,
    connect,
    disconnect,
    clearEvents,
  };
}
