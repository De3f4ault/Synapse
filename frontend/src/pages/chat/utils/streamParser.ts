/**
 * Parse SSE/WebSocket streams
 * Handles streaming response parsing from backend
 */

/**
 * Stream message types from backend
 */
export enum StreamMessageType {
  START = 'stream_start',
  CHUNK = 'stream_chunk',
  END = 'stream_end',
  ERROR = 'stream_error',
  THINKING = 'thinking',
  TOOL_USE = 'tool_use',
  METADATA = 'metadata',
}

/**
 * Base stream message interface
 */
export interface BaseStreamMessage {
  type: StreamMessageType;
  timestamp?: string;
}

/**
 * Stream start message
 */
export interface StreamStartMessage extends BaseStreamMessage {
  type: StreamMessageType.START;
  session_id: number;
  message_id: number;
  model: string;
}

/**
 * Stream chunk message (text delta)
 */
export interface StreamChunkMessage extends BaseStreamMessage {
  type: StreamMessageType.CHUNK;
  content: string;
  index?: number;
}

/**
 * Stream end message
 */
export interface StreamEndMessage extends BaseStreamMessage {
  type: StreamMessageType.END;
  message_id: number;
  tokens_used?: number;
  finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

/**
 * Stream error message
 */
export interface StreamErrorMessage extends BaseStreamMessage {
  type: StreamMessageType.ERROR;
  error: string;
  code?: string;
}

/**
 * Thinking process message
 */
export interface ThinkingMessage extends BaseStreamMessage {
  type: StreamMessageType.THINKING;
  thinking: string;
  step?: number;
}

/**
 * Tool use message
 */
export interface ToolUseMessage extends BaseStreamMessage {
  type: StreamMessageType.TOOL_USE;
  tool_name: string;
  tool_input: any;
  tool_output?: any;
}

/**
 * Metadata message
 */
export interface MetadataMessage extends BaseStreamMessage {
  type: StreamMessageType.METADATA;
  metadata: Record<string, any>;
}

/**
 * Union type of all stream messages
 */
export type StreamMessage =
| StreamStartMessage
| StreamChunkMessage
| StreamEndMessage
| StreamErrorMessage
| ThinkingMessage
| ToolUseMessage
| MetadataMessage;

/**
 * Parse a single stream chunk from backend
 */
export const parseStreamChunk = (chunk: string): StreamMessage | null => {
  try {
    // Remove any "data: " prefix (SSE format)
    const cleanedChunk = chunk.replace(/^data:\s*/, '').trim();

    // Skip empty chunks or comments
    if (!cleanedChunk || cleanedChunk.startsWith(':')) {
      return null;
    }

    // Parse JSON
    const parsed = JSON.parse(cleanedChunk);

    // Validate message type
    if (!parsed.type || !Object.values(StreamMessageType).includes(parsed.type)) {
      console.warn('Invalid stream message type:', parsed.type);
      return null;
    }

    return parsed as StreamMessage;
  } catch (error) {
    console.error('Failed to parse stream chunk:', error, 'Chunk:', chunk);
    return null;
  }
};

/**
 * Parse multiple chunks from a buffer
 */
export const parseStreamBuffer = (buffer: string): StreamMessage[] => {
  const messages: StreamMessage[] = [];

  // Split by newlines (SSE format)
  const lines = buffer.split('\n');

  for (const line of lines) {
    const message = parseStreamChunk(line);
    if (message) {
      messages.push(message);
    }
  }

  return messages;
};

/**
 * Stream accumulator for building complete messages
 */
export class StreamAccumulator {
  private content: string = '';
  private thinking: string[] = [];
  private metadata: Record<string, any> = {};
  private toolCalls: ToolUseMessage[] = [];
  private startMessage: StreamStartMessage | null = null;
  private endMessage: StreamEndMessage | null = null;
  private errors: string[] = [];

  /**
   * Process a stream message
   */
  process(message: StreamMessage): void {
    switch (message.type) {
      case StreamMessageType.START:
        this.startMessage = message;
        break;

      case StreamMessageType.CHUNK:
        this.content += message.content;
        break;

      case StreamMessageType.END:
        this.endMessage = message;
        break;

      case StreamMessageType.ERROR:
        this.errors.push(message.error);
        break;

      case StreamMessageType.THINKING:
        this.thinking.push(message.thinking);
        break;

      case StreamMessageType.TOOL_USE:
        this.toolCalls.push(message);
        break;

      case StreamMessageType.METADATA:
        this.metadata = { ...this.metadata, ...message.metadata };
        break;
    }
  }

  /**
   * Get accumulated content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get thinking process
   */
  getThinking(): string[] {
    return this.thinking;
  }

  /**
   * Get metadata
   */
  getMetadata(): Record<string, any> {
    return this.metadata;
  }

  /**
   * Get tool calls
   */
  getToolCalls(): ToolUseMessage[] {
    return this.toolCalls;
  }

  /**
   * Get start message
   */
  getStartMessage(): StreamStartMessage | null {
    return this.startMessage;
  }

  /**
   * Get end message
   */
  getEndMessage(): StreamEndMessage | null {
    return this.endMessage;
  }

  /**
   * Check if stream has errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get errors
   */
  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Check if stream is complete
   */
  isComplete(): boolean {
    return this.endMessage !== null;
  }

  /**
   * Reset accumulator
   */
  reset(): void {
    this.content = '';
    this.thinking = [];
    this.metadata = {};
    this.toolCalls = [];
    this.startMessage = null;
    this.endMessage = null;
    this.errors = [];
  }

  /**
   * Get complete message data
   */
  toMessage(): {
    content: string;
    thinking: string[];
    metadata: Record<string, any>;
    toolCalls: ToolUseMessage[];
    messageId?: number;
    tokensUsed?: number;
  } {
    return {
      content: this.content,
      thinking: this.thinking,
      metadata: this.metadata,
      toolCalls: this.toolCalls,
      messageId: this.endMessage?.message_id,
      tokensUsed: this.endMessage?.tokens_used,
    };
  }
}

/**
 * Extract text content from stream messages
 */
export const extractTextFromStream = (messages: StreamMessage[]): string => {
  return messages
  .filter((msg): msg is StreamChunkMessage => msg.type === StreamMessageType.CHUNK)
  .map(msg => msg.content)
  .join('');
};

/**
 * Extract thinking from stream messages
 */
export const extractThinkingFromStream = (messages: StreamMessage[]): string[] => {
  return messages
  .filter((msg): msg is ThinkingMessage => msg.type === StreamMessageType.THINKING)
  .map(msg => msg.thinking);
};

/**
 * Check if stream has errors
 */
export const hasStreamErrors = (messages: StreamMessage[]): boolean => {
  return messages.some(msg => msg.type === StreamMessageType.ERROR);
};

/**
 * Get stream errors
 */
export const getStreamErrors = (messages: StreamMessage[]): string[] => {
  return messages
  .filter((msg): msg is StreamErrorMessage => msg.type === StreamMessageType.ERROR)
  .map(msg => msg.error);
};

/**
 * Format stream for display (debug)
 */
export const formatStreamForDebug = (messages: StreamMessage[]): string => {
  return messages
  .map(msg => {
    const timestamp = msg.timestamp ? `[${msg.timestamp}]` : '';
    return `${timestamp} ${msg.type}: ${JSON.stringify(msg, null, 2)}`;
  })
  .join('\n\n');
};

/**
 * Estimate tokens from text (rough approximation)
 */
export const estimateTokens = (text: string): number => {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
};

/**
 * Calculate stream statistics
 */
export interface StreamStats {
  totalChunks: number;
  totalTokens: number;
  thinkingSteps: number;
  toolCalls: number;
  duration?: number;
  errors: number;
}

export const calculateStreamStats = (messages: StreamMessage[]): StreamStats => {
  const startMsg = messages.find(msg => msg.type === StreamMessageType.START) as StreamStartMessage | undefined;
  const endMsg = messages.find(msg => msg.type === StreamMessageType.END) as StreamEndMessage | undefined;

  const content = extractTextFromStream(messages);
  const thinking = extractThinkingFromStream(messages);
  const errors = getStreamErrors(messages);

  const stats: StreamStats = {
    totalChunks: messages.filter(msg => msg.type === StreamMessageType.CHUNK).length,
    totalTokens: endMsg?.tokens_used || estimateTokens(content),
    thinkingSteps: thinking.length,
    toolCalls: messages.filter(msg => msg.type === StreamMessageType.TOOL_USE).length,
    errors: errors.length,
  };

  // Calculate duration if timestamps available
  if (startMsg?.timestamp && endMsg?.timestamp) {
    const start = new Date(startMsg.timestamp).getTime();
    const end = new Date(endMsg.timestamp).getTime();
    stats.duration = end - start;
  }

  return stats;
};
