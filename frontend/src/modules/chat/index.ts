// Chat Module - Public API
// Only export through this barrel file to maintain module isolation

// Components
export { ChatInterface } from "./components/ChatInterface";
export { ContextPanel } from "./components/ContextPanel";
export { MessageInput } from "./components/MessageInput";
export { MessageList } from "./components/MessageList";
export {
  StreamingMessage,
  TypingIndicator,
  MessageBubble,
} from "./components/StreamingMessage";

// Hooks
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
