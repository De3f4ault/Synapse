/**
 * WebSocket streaming types
 * Enhanced types for real-time streaming communication
 */

/**
 * Stream message types
 */
export enum StreamMessageType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',

  // Stream lifecycle
  STREAM_START = 'stream_start',
  STREAM_CHUNK = 'stream_chunk',
  STREAM_END = 'stream_end',
  STREAM_ERROR = 'stream_error',
  STREAM_CANCEL = 'stream_cancel',

  // Content types
  TEXT = 'text',
  THINKING = 'thinking',
  TOOL_USE = 'tool_use',
  METADATA = 'metadata',

  // Control messages
  PING = 'ping',
  PONG = 'pong',
  ACK = 'ack',
}

/**
 * Base stream message
 */
export interface BaseStreamMessage {
  type: StreamMessageType | string;
  timestamp?: string;
  id?: string;
}

/**
 * Connection message
 */
export interface ConnectionMessage extends BaseStreamMessage {
  type: StreamMessageType.CONNECT | StreamMessageType.DISCONNECT | StreamMessageType.RECONNECT;
  sessionId?: number;
  reconnectAttempt?: number;
}

/**
 * Stream start message
 */
export interface StreamStartMessage extends BaseStreamMessage {
  type: StreamMessageType.STREAM_START;
  sessionId: number;
  messageId: number;
  model: string;
  mode?: 'normal' | 'deepthink' | 'search';
}

/**
 * Stream chunk message
 */
export interface StreamChunkMessage extends BaseStreamMessage {
  type: StreamMessageType.STREAM_CHUNK;
  content: string;
  index?: number;
  delta?: string; // For incremental updates
}

/**
 * Stream end message
 */
export interface StreamEndMessage extends BaseStreamMessage {
  type: StreamMessageType.STREAM_END;
  messageId: number;
  tokensUsed?: number;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'cancelled';
  metadata?: Record<string, any>;
}

/**
 * Stream error message
 */
export interface StreamErrorMessage extends BaseStreamMessage {
  type: StreamMessageType.STREAM_ERROR;
  error: string;
  code?: string;
  details?: any;
  recoverable?: boolean;
}

/**
 * Stream cancel message
 */
export interface StreamCancelMessage extends BaseStreamMessage {
  type: StreamMessageType.STREAM_CANCEL;
  messageId: number;
  reason?: string;
}

/**
 * Thinking message
 */
export interface ThinkingMessage extends BaseStreamMessage {
  type: StreamMessageType.THINKING;
  thinking: string;
  step?: number;
  stepType?: 'reasoning' | 'analysis' | 'planning' | 'conclusion';
}

/**
 * Tool use message
 */
export interface ToolUseMessage extends BaseStreamMessage {
  type: StreamMessageType.TOOL_USE;
  toolName: string;
  toolInput: any;
  toolOutput?: any;
  status?: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

/**
 * Metadata message
 */
export interface MetadataMessage extends BaseStreamMessage {
  type: StreamMessageType.METADATA;
  metadata: Record<string, any>;
}

/**
 * Control messages
 */
export interface ControlMessage extends BaseStreamMessage {
  type: StreamMessageType.PING | StreamMessageType.PONG | StreamMessageType.ACK;
  data?: any;
}

/**
 * Union type of all stream messages
 */
export type StreamMessage =
| ConnectionMessage
| StreamStartMessage
| StreamChunkMessage
| StreamEndMessage
| StreamErrorMessage
| StreamCancelMessage
| ThinkingMessage
| ToolUseMessage
| MetadataMessage
| ControlMessage;

/**
 * Stream state
 */
export type StreamState = 'idle' | 'connecting' | 'streaming' | 'paused' | 'completed' | 'error' | 'cancelled';

/**
 * Stream context
 */
export interface StreamContext {
  sessionId: number;
  messageId?: number;
  model?: string;
  mode?: 'normal' | 'deepthink' | 'search';
  startedAt?: string;
  endedAt?: string;
}

/**
 * Stream statistics
 */
export interface StreamStatistics {
  totalChunks: number;
  totalTokens: number;
  tokensPerSecond: number;
  duration: number;
  thinkingSteps: number;
  toolCalls: number;
  averageChunkSize: number;
}

/**
 * Stream buffer
 */
export interface StreamBuffer {
  content: string;
  thinking: string[];
  toolCalls: ToolUseMessage[];
  metadata: Record<string, any>;
  chunks: StreamChunkMessage[];
}

/**
 * Stream options
 */
export interface StreamOptions {
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  timeout?: number;
  bufferSize?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: StreamErrorMessage) => void;
  onMessage?: (message: StreamMessage) => void;
}

/**
 * Stream event handlers
 */
export interface StreamEventHandlers {
  onStart?: (message: StreamStartMessage) => void;
  onChunk?: (message: StreamChunkMessage) => void;
  onEnd?: (message: StreamEndMessage) => void;
  onError?: (message: StreamErrorMessage) => void;
  onThinking?: (message: ThinkingMessage) => void;
  onToolUse?: (message: ToolUseMessage) => void;
  onMetadata?: (message: MetadataMessage) => void;
}

/**
 * Stream connection config
 */
export interface StreamConnectionConfig {
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * Stream health status
 */
export interface StreamHealthStatus {
  connected: boolean;
  latency: number;
  lastMessageAt?: string;
  missedHeartbeats: number;
  reconnectAttempts: number;
  error?: string;
}

/**
 * Stream queue item
 */
export interface StreamQueueItem {
  id: string;
  message: StreamMessage;
  timestamp: string;
  priority: number;
  retries: number;
}

/**
 * Stream performance metrics
 */
export interface StreamPerformanceMetrics {
  messageRate: number; // messages per second
  dataRate: number; // bytes per second
  latency: number; // milliseconds
  jitter: number; // latency variance
  packetLoss: number; // percentage
  uptime: number; // seconds
}
