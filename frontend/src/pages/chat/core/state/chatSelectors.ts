/**
 * Chat Selectors - Derived State
 *
 * Fine-grained subscriptions for optimal re-renders.
 * Components subscribe to exactly what they need.
 */

import { useChatStore } from './chatStore';

// Connection state
export const useConnectionState = () => useChatStore((s) => s.connectionState);
export const useIsConnected = () => useChatStore((s) => s.connectionState === 'connected');

// Chat mode
export const useChatMode = () => useChatStore((s) => s.chatMode);
export const useToggleChatMode = () => useChatStore((s) => s.toggleChatMode);
export const useSetChatMode = () => useChatStore((s) => s.setChatMode);

// Streaming state
export const useStreamingState = () => useChatStore((s) => s.streaming);
export const useIsStreaming = () => useChatStore((s) => s.streaming.isStreaming);
export const useStreamingContent = () => useChatStore((s) => s.streaming.content);
export const useStreamingThinking = () => useChatStore((s) => s.streaming.thinking);
export const useStreamingModel = () => useChatStore((s) => s.streaming.model);
export const useStreamingSources = () => useChatStore((s) => s.streaming.sources);

// Tool calls
export const useToolCalls = () => useChatStore((s) => s.toolCalls);
export const useHasActiveToolCalls = () =>
    useChatStore((s) => s.toolCalls.some((tc) => tc.status === 'pending' || tc.status === 'executing'));

// Actions (stable references)
export const useChatActions = () =>
    useChatStore((s) => ({
        setConnectionState: s.setConnectionState,
        appendContent: s.appendContent,
        appendThinking: s.appendThinking,
        setModel: s.setModel,
        setSources: s.setSources,
        setIsStreaming: s.setIsStreaming,
        clearStreaming: s.clearStreaming,
        addToolCall: s.addToolCall,
        updateToolCall: s.updateToolCall,
        clearToolCalls: s.clearToolCalls,
        reset: s.reset,
    }));

// Computed: has any streaming content
export const useHasStreamingContent = () =>
    useChatStore((s) => s.streaming.content.length > 0 || s.streaming.thinking.length > 0);
