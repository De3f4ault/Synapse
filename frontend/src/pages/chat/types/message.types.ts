/**
 * Message types
 * Extended message types for UI and state management
 */

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message status
 */
export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'error' | 'cancelled';

/**
 * Message content type
 */
export type MessageContentType = 'text' | 'code' | 'image' | 'file' | 'mixed';

/**
 * Base message interface
 */
export interface BaseMessage {
  id: number | string;
  role: MessageRole;
  content: string;
  created_at: string;
  session_id: number;
}

/**
 * User message
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
  attachments?: MessageAttachment[];
}

/**
 * Assistant message
 */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  model_used?: string;
  tokens?: number;
  thinking?: string | string[];
  tool_calls?: ToolCall[];
  finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

/**
 * System message
 */
export interface SystemMessage extends BaseMessage {
  role: 'system';
  type: 'info' | 'warning' | 'error';
}

/**
 * Message with UI state
 */
export interface MessageWithState extends BaseMessage {
  status: MessageStatus;
  error?: string;
  isOptimistic?: boolean;
  retryCount?: number;
  metadata?: MessageMetadata;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  editedAt?: string;
  editCount?: number;
  reactions?: MessageReaction[];
  isFavorite?: boolean;
  tags?: string[];
  customData?: Record<string, any>;
}

/**
 * Message reaction
 */
export interface MessageReaction {
  emoji: string;
  count: number;
  users?: number[];
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  id: string;
  type: 'image' | 'document' | 'code' | 'link';
  url: string;
  filename: string;
  size: number;
  mimeType?: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

/**
 * Tool call (function calling)
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  status: 'pending' | 'success' | 'error';
}

/**
 * Message action
 */
export type MessageAction = 'copy' | 'edit' | 'delete' | 'regenerate' | 'react' | 'share' | 'favorite';

/**
 * Message action event
 */
export interface MessageActionEvent {
  action: MessageAction;
  messageId: number | string;
  data?: any;
}

/**
 * Message group (consecutive messages from same role)
 */
export interface MessageGroup {
  role: MessageRole;
  messages: BaseMessage[];
  timestamp: string;
}

/**
 * Message draft (unsent message)
 */
export interface MessageDraft {
  sessionId: number;
  content: string;
  attachments: File[];
  mode: 'normal' | 'deepthink' | 'search';
  savedAt: string;
}

/**
 * Message edit history
 */
export interface MessageEditHistory {
  messageId: number;
  edits: Array<{
    content: string;
    editedAt: string;
  }>;
}

/**
 * Message search filter
 */
export interface MessageSearchFilter {
  query: string;
  role?: MessageRole;
  dateFrom?: string;
  dateTo?: string;
  sessionId?: number;
  hasAttachments?: boolean;
}

/**
 * Message pagination
 */
export interface MessagePagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * Message list response
 */
export interface MessageListResponse {
  messages: BaseMessage[];
  pagination: MessagePagination;
}

/**
 * Message validation result
 */
export interface MessageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Message formatting options
 */
export interface MessageFormattingOptions {
  showTimestamp: boolean;
  showTokenCount: boolean;
  showModel: boolean;
  enableMarkdown: boolean;
  enableCodeHighlight: boolean;
  maxLength?: number;
}

/**
 * Message rendering context
 */
export interface MessageRenderingContext {
  isStreaming: boolean;
  isLastMessage: boolean;
  isFirstMessage: boolean;
  previousMessage?: BaseMessage;
  nextMessage?: BaseMessage;
}
