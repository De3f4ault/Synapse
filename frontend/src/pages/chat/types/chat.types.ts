/**
 * Main chat types
 * Extended types for chat functionality beyond backend API types
 */

import type { ChatSessionResponse, ChatMessageResponse } from '@/api/generated/types.gen';

/**
 * Chat mode options
 */
export type ChatMode = 'normal' | 'deepthink' | 'search';

/**
 * Chat session with additional UI state
 */
export interface ChatSession extends ChatSessionResponse {
  isActive?: boolean;
  unreadCount?: number;
  lastViewedAt?: string;
}

/**
 * Extended chat message with UI state
 */
export interface ChatMessage extends ChatMessageResponse {
  isStreaming?: boolean;
  error?: string;
  isOptimistic?: boolean; // For optimistic updates
  retryCount?: number;
}

/**
 * Chat input state
 */
export interface ChatInputState {
  value: string;
  mode: ChatMode;
  attachments: File[];
  isSubmitting: boolean;
  isFocused: boolean;
}

/**
 * Chat UI preferences
 */
export interface ChatPreferences {
  defaultMode: ChatMode;
  autoScroll: boolean;
  showTimestamps: boolean;
  showTokenCounts: boolean;
  codeTheme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  messageSpacing: 'compact' | 'comfortable' | 'spacious';
  enableSounds: boolean;
  enableAnimations: boolean;
}

/**
 * Chat session group
 */
export interface ChatSessionGroup {
  label: string;
  sessions: ChatSession[];
  count: number;
}

/**
 * Chat statistics
 */
export interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  averageMessagesPerSession: number;
  mostUsedModel: string;
  lastActivityDate: string;
}

/**
 * Chat search result
 */
export interface ChatSearchResult {
  sessionId: number;
  messageId: number;
  sessionTitle: string;
  messageContent: string;
  matchedText: string;
  timestamp: string;
  relevance: number;
}

/**
 * Chat export format
 */
export type ChatExportFormat = 'json' | 'markdown' | 'txt' | 'pdf';

/**
 * Chat export options
 */
export interface ChatExportOptions {
  format: ChatExportFormat;
  includeTimestamps: boolean;
  includeMetadata: boolean;
  includeThinking: boolean;
  includeAttachments: boolean;
}

/**
 * Chat keyboard shortcut action
 */
export type ChatShortcutAction =
| 'new_chat'
| 'search'
| 'send_message'
| 'toggle_sidebar'
| 'toggle_preview'
| 'focus_input'
| 'scroll_to_top'
| 'scroll_to_bottom'
| 'copy_last_message'
| 'regenerate_last'
| 'delete_session';

/**
 * Chat notification type
 */
export type ChatNotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Chat notification
 */
export interface ChatNotification {
  id: string;
  type: ChatNotificationType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Chat error
 */
export interface ChatError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

/**
 * Chat loading state
 */
export interface ChatLoadingState {
  isSending: boolean;
  isStreaming: boolean;
  isLoadingMessages: boolean;
  isLoadingSessions: boolean;
  isCreatingSession: boolean;
  isDeletingSession: boolean;
}

/**
 * Chat connection status
 */
export type ChatConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

/**
 * Chat WebSocket state
 */
export interface ChatWebSocketState {
  status: ChatConnectionStatus;
  lastConnected?: string;
  lastDisconnected?: string;
  reconnectAttempts: number;
  error?: string;
}
