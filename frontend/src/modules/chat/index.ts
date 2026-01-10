// Chat Module - Public API
// Only export through this barrel file to maintain module isolation

// ==================== COMPONENTS ====================
export { ChatInterface } from "./components/ChatInterface";
export { ContextPanel } from "./components/ContextPanel";
export { MessageInput } from "./components/MessageInput";
export { MessageList } from "./components/MessageList";
export {
  StreamingMessage,
  TypingIndicator,
  MessageBubble,
} from "./components/StreamingMessage";
export { ChatMessage } from "./components/ChatMessage";

// ==================== HOOKS ====================

// WebSocket & Streaming
export {
  useChatWebSocket,
  type WebSocketStatus,
  type StreamingChunk,
  type ChatWebSocketMessage,
} from "./hooks/useChatWebSocket";

export {
  useStreamingMessage,
  useTypingEffect,
} from "./hooks/useStreamingMessage";

export { useChatStreaming, type WebSocketState } from "./hooks/useChatStreaming";

// Session Management
export {
  useChatSessions,
  useChatSession,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
} from "./hooks/useChatSession";

// Message Management
export {
  useChatMessages,
  useSendMessage,
  useAddMessage,
  useUpdateMessage,
} from "./hooks/useChatMessages";

// Title Generation
export { useTitleGeneration } from "./hooks/useTitleGeneration";

