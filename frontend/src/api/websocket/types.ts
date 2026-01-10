// WebSocket message types - EXTENDED with unified message format

/**
 * WebSocket connection states
 */
export type WebSocketState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/**
 * Connection state (alias for compatibility)
 */
export type ConnectionState = WebSocketState;

// ==================== UNIFIED MESSAGE FORMAT ====================

/**
 * Unified WebSocket message format
 */
export interface WebSocketMessage {
  channel?: "dashboard" | "chat" | "study" | "activity";
  type?: string;
  event?: string; // Alternative to 'type'
  data?: unknown;
  timestamp?: string;
  message_id?: string;
}

/**
 * Message handler type
 */
export type MessageHandler<T = any> = (data: T) => void;

/**
 * Unsubscribe function type
 */
export type UnsubscribeFn = () => void;

// ==================== DASHBOARD EVENT TYPES ====================

export interface CardReviewedData {
  card_id: number;
  quality: number;
  next_review?: string;
}

export interface NoteUpdatedData {
  note_id: number;
  title: string;
}

export interface NoteCreatedData {
  note_id: number;
  title: string;
}

export interface QuizCompletedData {
  quiz_id: number;
  score: number;
  passed: boolean;
}

export interface DocumentUploadedData {
  document_id: number;
  filename: string;
  status: string;
}

export interface ChatMessageData {
  session_id: number;
  preview: string;
}

/**
 * Dashboard event types
 */
export interface DashboardEvents {
  card_reviewed: CardReviewedData;
  note_created: NoteCreatedData;
  note_updated: NoteUpdatedData;
  quiz_completed: QuizCompletedData;
  document_uploaded: DocumentUploadedData;
  chat_message: ChatMessageData;
  stats_updated: Record<string, unknown>;
}

// ==================== CHAT WEBSOCKET TYPES ====================

/**
 * Chat WebSocket message types
 */
export type ChatWSMessage =
  | {
      type: "connected";
      session_id: number;
    }
  | {
      type: "message";
      role: "assistant" | "user" | "system";
      content: string;
      streaming: boolean;
    }
  | {
      type: "error";
      message: string;
    };

/**
 * Chat client message types (outgoing)
 */
export type ChatClientMessage = {
  type: "message";
  content: string;
};

// ==================== STUDY WEBSOCKET TYPES ====================

/**
 * Study WebSocket message types (for future real-time study sessions)
 */
export type StudyWSMessage =
  | {
      type: "connected";
      session_id: number;
    }
  | {
      type: "item_update";
      item_id: number;
      item_type: string;
      data: Record<string, unknown>;
    }
  | {
      type: "session_update";
      session_id: number;
      items_completed: number;
      items_correct: number;
    }
  | {
      type: "error";
      message: string;
    };

/**
 * Study client message types (outgoing)
 */
export type StudyClientMessage =
  | {
      type: "item_completed";
      item_id: number;
      correct: boolean;
      time_taken_ms: number;
    }
  | {
      type: "session_pause";
    }
  | {
      type: "session_resume";
    };

// ==================== WEBSOCKET OPTIONS ====================

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  /**
   * Auto-reconnect on disconnect
   */
  autoReconnect?: boolean;
  /**
   * Reconnect delay in milliseconds
   */
  reconnectDelay?: number;
  /**
   * Maximum reconnect attempts
   */
  maxReconnectAttempts?: number;
  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout?: number;
}
