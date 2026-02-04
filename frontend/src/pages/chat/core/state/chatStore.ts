/**
 * Chat Store - Single Source of Truth for Streaming State
 *
 * INVARIANT:
 * This store is the sole authority for streaming/ephemeral chat state.
 * Other modules may read via selectors but MUST NOT mutate directly.
 *
 * Key invariants:
 * - Token append ≠ message commit
 * - UI never reads directly from WebSocket callbacks
 * - Streaming state is ephemeral and disposable
 *
 * INVARIANT:
 * streamingContent represents an in-flight response.
 * It MUST be committed to the message list explicitly.
 * Clearing streaming does NOT delete messages.
 *
 * INVARIANT:
 * This store is the single authority for this domain.
 * UI and hooks must never derive parallel state.
 *
 * CONTRACT: Session Boundary
 * `resetForSession` MUST be idempotent (safe to call multiple times with same sessionId).
 *
 * CONTRACT: Backpressure
 * When `streamingPaused=true`, tokens are buffered, not appended.
 * Buffered tokens preserve sequence order.
 *
 * CONTRACT: Monotonic IDs
 * `lastSequenceId` is monotonic per session, not globally unique.
 */

import { create } from 'zustand';
import {
    ConnectionState,
    StreamingState,
    GroundingSource,
    ToolCall,
    INITIAL_STREAMING_STATE,
} from '../engine/types';

interface ChatState {
    // Connection state
    connectionState: ConnectionState;

    // Chat mode: "tutor" (Socratic) or "general" (direct answers)
    chatMode: 'tutor' | 'general';

    // Streaming state (ephemeral - cleared on complete)
    streaming: StreamingState;

    // Active tool calls during streaming
    toolCalls: ToolCall[];

    // Error ownership (Contract #3)
    error: string | null;

    // Backpressure (Contract #2)
    streamingPaused: boolean;
    tokenBuffer: string[];

    // Monotonic sequence (Contract #4)
    lastSequenceId: number;
    currentSessionId: number | null;

    // Actions - Connection
    setConnectionState: (state: ConnectionState) => void;

    // Actions - Chat Mode
    setChatMode: (mode: 'tutor' | 'general') => void;
    toggleChatMode: () => void;

    // Actions - Streaming
    appendContent: (text: string) => void;
    appendThinking: (text: string) => void;
    setModel: (model: string) => void;
    setSources: (sources: GroundingSource[]) => void;
    setIsStreaming: (isStreaming: boolean) => void;

    // Actions - Tool calls
    addToolCall: (call: ToolCall) => void;
    updateToolCall: (name: string, updates: Partial<ToolCall>) => void;
    clearToolCalls: () => void;

    // Actions - Error ownership
    setError: (error: string | null) => void;
    clearError: () => void;

    // Actions - Backpressure
    pauseStream: () => void;
    resumeStream: () => void;

    // Actions - Reset
    clearStreaming: () => void;
    reset: () => void;

    // Actions - Session boundary (Contract #1)
    resetForSession: (sessionId: number) => void;
}

// Load persisted chat mode from localStorage
const getPersistedChatMode = (): 'tutor' | 'general' => {
    if (typeof window === 'undefined') return 'tutor';
    const saved = localStorage.getItem('synapse-chat-mode');
    return saved === 'general' ? 'general' : 'tutor';
};

export const useChatStore = create<ChatState>((set, get) => ({
    // Initial state
    connectionState: 'disconnected',
    chatMode: getPersistedChatMode(),  // Load from localStorage
    streaming: INITIAL_STREAMING_STATE,
    toolCalls: [],
    error: null,
    streamingPaused: false,
    tokenBuffer: [],
    lastSequenceId: 0,
    currentSessionId: null,

    // Connection
    setConnectionState: (connectionState) => set({ connectionState }),

    // Chat Mode (with localStorage persistence)
    setChatMode: (chatMode) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('synapse-chat-mode', chatMode);
        }
        set({ chatMode });
    },
    toggleChatMode: () => {
        const newMode = get().chatMode === 'tutor' ? 'general' : 'tutor';
        if (typeof window !== 'undefined') {
            localStorage.setItem('synapse-chat-mode', newMode);
        }
        set({ chatMode: newMode });
    },

    // Streaming - append operations (key for token-by-token updates)
    appendContent: (text) => {
        const state = get();
        // Backpressure: buffer if paused
        if (state.streamingPaused) {
            set({ tokenBuffer: [...state.tokenBuffer, text] });
            return;
        }
        set({
            streaming: {
                ...state.streaming,
                content: state.streaming.content + text,
                isStreaming: true,
            },
            lastSequenceId: state.lastSequenceId + 1,
        });
    },

    appendThinking: (text) =>
        set((state) => ({
            streaming: {
                ...state.streaming,
                thinking: state.streaming.thinking + text,
            },
        })),

    setModel: (model) =>
        set((state) => ({
            streaming: { ...state.streaming, model },
        })),

    setSources: (sources) =>
        set((state) => ({
            streaming: { ...state.streaming, sources },
        })),

    setIsStreaming: (isStreaming) =>
        set((state) => ({
            streaming: { ...state.streaming, isStreaming },
        })),

    // Tool calls
    addToolCall: (call) =>
        set((state) => ({
            toolCalls: [...state.toolCalls, call],
        })),

    updateToolCall: (name, updates) =>
        set((state) => ({
            toolCalls: state.toolCalls.map((tc) =>
                tc.name === name ? { ...tc, ...updates } : tc
            ),
        })),

    clearToolCalls: () => set({ toolCalls: [] }),

    // Error ownership
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Backpressure
    pauseStream: () => set({ streamingPaused: true }),
    resumeStream: () => {
        const state = get();
        // Flush buffer in order
        const bufferedContent = state.tokenBuffer.join('');
        set({
            streamingPaused: false,
            tokenBuffer: [],
            streaming: {
                ...state.streaming,
                content: state.streaming.content + bufferedContent,
            },
        });
    },

    // Clear streaming state (on complete or error)
    clearStreaming: () =>
        set({
            streaming: INITIAL_STREAMING_STATE,
            toolCalls: [],
            streamingPaused: false,
            tokenBuffer: [],
        }),

    // Full reset
    reset: () =>
        set({
            connectionState: 'disconnected',
            streaming: INITIAL_STREAMING_STATE,
            toolCalls: [],
            error: null,
            streamingPaused: false,
            tokenBuffer: [],
            lastSequenceId: 0,
            currentSessionId: null,
        }),

    // Session boundary - idempotent reset for session change
    resetForSession: (sessionId) => {
        const state = get();
        // Idempotent: skip if same session
        if (state.currentSessionId === sessionId) {
            return;
        }
        set({
            streaming: INITIAL_STREAMING_STATE,
            toolCalls: [],
            error: null,
            streamingPaused: false,
            tokenBuffer: [],
            lastSequenceId: 0,
            currentSessionId: sessionId,
        });
    },
}));

