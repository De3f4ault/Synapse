// Study WebSocket client - REFACTORED (placeholder for future)
import { getAuthToken } from "../client";
import type {
  StudyWSMessage,
  StudyClientMessage,
  WebSocketState,
} from "./types";

/**
 * Study WebSocket client for real-time study session updates
 *
 * REFACTORED: Maintains same API but ready for future integration.
 * Note: Backend WebSocket endpoint not yet implemented, placeholder for future use.
 */
export class StudyWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: number;
  private url: string;
  private options: Required<{
    autoReconnect: boolean;
    reconnectDelay: number;
    maxReconnectAttempts: number;
    connectionTimeout: number;
  }>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(message: StudyWSMessage) => void> = new Set();
  private stateHandlers: Set<(state: WebSocketState) => void> = new Set();

  constructor(sessionId: number, options: Partial<{
    autoReconnect: boolean;
    reconnectDelay: number;
    maxReconnectAttempts: number;
    connectionTimeout: number;
  }> = {}) {
    this.sessionId = sessionId;

    // Get WebSocket URL from environment
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    const token = getAuthToken();

    this.url = `${wsUrl}/ws/study/${sessionId}?token=${token}`;

    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      connectionTimeout: options.connectionTimeout ?? 10000,
    };
  }

  /**
   * Connect to WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.updateState("connecting");

    try {
      this.ws = new WebSocket(this.url);

      // Connection opened
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateState("connected");
      };

      // Listen for messages
      this.ws.onmessage = (event) => {
        try {
          const message: StudyWSMessage = JSON.parse(event.data);
          this.notifyMessageHandlers(message);
        } catch (error) {
          console.error("[Study WS] Failed to parse message:", error);
        }
      };

      // Connection closed
      this.ws.onclose = () => {
        this.updateState("disconnected");
        this.ws = null;

        // Auto-reconnect if enabled
        if (
          this.options.autoReconnect &&
          this.reconnectAttempts < this.options.maxReconnectAttempts
        ) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, this.options.reconnectDelay);
        }
      };

      // Connection error
      this.ws.onerror = (error) => {
        console.error("[Study WS] Error:", error);
        this.updateState("error");
      };
    } catch (error) {
      console.error("[Study WS] Failed to create connection:", error);
      this.updateState("error");
    }
  }

  /**
   * Send item completed event
   */
  sendItemCompleted(
    itemId: number,
    correct: boolean,
    timeTakenMs: number,
  ): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message: StudyClientMessage = {
      type: "item_completed",
      item_id: itemId,
      correct,
      time_taken_ms: timeTakenMs,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Pause study session
   */
  pauseSession(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message: StudyClientMessage = {
      type: "session_pause",
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Resume study session
   */
  resumeSession(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message: StudyClientMessage = {
      type: "session_resume",
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: (message: StudyWSMessage) => void): () => void {
    this.messageHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(handler: (state: WebSocketState) => void): () => void {
    this.stateHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.messageHandlers.clear();
    this.stateHandlers.clear();
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    if (!this.ws) return "disconnected";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "error";
    }
  }

  private updateState(state: WebSocketState): void {
    this.stateHandlers.forEach((handler) => handler(state));
  }

  private notifyMessageHandlers(message: StudyWSMessage): void {
    this.messageHandlers.forEach((handler) => handler(message));
  }
}
