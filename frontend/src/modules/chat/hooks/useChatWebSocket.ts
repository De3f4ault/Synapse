import { useState, useEffect, useCallback, useRef } from "react";
import { WS_BASE_URL, CHAT } from "@/lib/constants";
import { STORAGE_KEYS } from "@/hooks/useLocalStorage";
import type { ChatMessageResponse } from "@/api/generated";

// Extract role type from ChatMessageResponse
type MessageRole = ChatMessageResponse["role"];

export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface StreamingChunk {
  content: string;
  done: boolean;
  type?: 'token' | 'thinking';  // Added for thinking transparency
}

export interface ChatWebSocketMessage {
  type: "connected" | "message" | "chunk" | "thinking" | "routing" | "error" | "done";
  session_id?: number;
  role?: MessageRole;
  content?: string;
  text?: string;  // For thinking/token chunks from backend
  streaming?: boolean;
  message_id?: number;
  error?: string;
  // Routing metadata
  mode?: string;
  model?: string;
  thinking_ui?: 'off' | 'collapsed' | 'panel';
  agent?: string;
  confidence?: number;
}

interface UseChatWebSocketOptions {
  sessionId: number;
  onMessage?: (message: ChatMessageResponse) => void;
  onChunk?: (chunk: StreamingChunk) => void;
  onThinking?: (thinking: string) => void;  // New callback for thinking content
  onRouting?: (metadata: { mode: string; model: string; thinkingUi: string; agent: string }) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
}

export function useChatWebSocket({
  sessionId,
  onMessage,
  onChunk,
  onThinking,
  onRouting,
  onError,
  onStatusChange,
}: UseChatWebSocketOptions) {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateStatus = useCallback(
    (newStatus: WebSocketStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      updateStatus("error");
      onError?.("No authentication token");
      return;
    }

    updateStatus("connecting");

    const wsUrl = `${WS_BASE_URL}/api/v1/ws/chat/${sessionId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      updateStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data: ChatWebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            // Connection confirmed
            break;

          case "chunk":
            setIsStreaming(true);
            if (data.content !== undefined || data.text !== undefined) {
              onChunk?.({ 
                content: data.content || data.text || "", 
                done: false,
                type: 'token'
              });
            }
            break;

          case "thinking":
            // Handle thinking/reasoning chunks
            if (data.text) {
              onThinking?.(data.text);
              onChunk?.({ content: data.text, done: false, type: 'thinking' });
            }
            break;

          case "routing":
            // Handle routing metadata (mode, model, thinkingUi)
            if (data.mode && data.model) {
              onRouting?.({
                mode: data.mode,
                model: data.model,
                thinkingUi: data.thinking_ui || 'off',
                agent: data.agent || 'tutor',
              });
            }
            break;

          case "done":
            setIsStreaming(false);
            onChunk?.({ content: "", done: true });
            break;

          case "message":
            setIsStreaming(false);
            if (data.content && data.role && data.message_id) {
              onMessage?.({
                id: data.message_id,
                session_id: sessionId,
                role: data.role,
                content: data.content,
                tokens: 0,
                model_used: null,
                created_at: new Date().toISOString(),
              });
            }
            break;

          case "error":
            setIsStreaming(false);
            onError?.(data.error || "Unknown error");
            break;
        }
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    ws.onerror = () => {
      updateStatus("error");
    };

    ws.onclose = () => {
      updateStatus("disconnected");
      wsRef.current = null;

      // Attempt reconnection
      if (reconnectAttemptsRef.current < CHAT.MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          CHAT.RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
          CHAT.MAX_RECONNECT_DELAY,
        );
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
  }, [sessionId, updateStatus, onMessage, onChunk, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = CHAT.MAX_RECONNECT_ATTEMPTS; // Prevent reconnection

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    updateStatus("disconnected");
  }, [updateStatus]);

  const sendMessage = useCallback(
    (content: string, options?: { modeId?: string; tierOverride?: string }) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        onError?.("WebSocket not connected");
        return false;
      }

      try {
        wsRef.current.send(
          JSON.stringify({
            type: "message",
            content,
            mode_id: options?.modeId || 'socratic',
            tier_override: options?.tierOverride,
          }),
        );
        return true;
      } catch {
        onError?.("Failed to send message");
        return false;
      }
    },
    [onError],
  );

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    isStreaming,
    connect,
    disconnect,
    sendMessage,
    isConnected: status === "connected",
  };
}

export default useChatWebSocket;
