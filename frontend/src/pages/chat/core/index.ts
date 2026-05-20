/**
 * Core Chat Module - Public API
 *
 * This is the ONLY entry point for the core chat module.
 * No deep imports across modules allowed.
 */

// Components
export { ChatMain, ChatConversationView, ChatMessage, ChatInputBox, ChatWelcomeScreen } from './components';

// Hooks
export { useSynapseChat, useChatMessages, useAddMessage, useUpdateMessage, useInvalidateMessages } from './hooks';

// Re-export session hooks from sidebar for convenience (ChatPage uses these)
export { useChatSessions, useChatSession, useCreateSession } from '../sidebar/hooks';

// State (selectors only - store internals are private)
export { useChatStore } from './state/chatStore';
export {
    useConnectionState,
    useIsConnected,
    useStreamingState,
    useIsStreaming,
    useStreamingContent,
    useStreamingThinking,
    useStreamingModel,
    useStreamingSources,
    useToolCalls,
    useHasActiveToolCalls,
    useChatActions,
    useHasStreamingContent,
} from './state/chatSelectors';

// Engine types (for external typing only)
export type {
    ConnectionState,
    StreamingState,
    GroundingSource,
    ToolCall,
    MessageRole,
    ChatMessage as ChatMessageType,
} from './engine/types';
