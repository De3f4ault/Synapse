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

    // Chat mode: supports multiple AI interaction modes
    chatMode: 'direct' | 'tutor' | 'deep_think' | 'creative' | 'research';

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

    // Comparison mode state
    isComparisonMode: boolean;
    selectedModels: [string, string];  // [Model A, Model B]
    comparisonStreaming: {
        A: { content: string; thinking: string; isComplete: boolean };
        B: { content: string; thinking: string; isComplete: boolean };
    };

    // Actions - Connection
    setConnectionState: (state: ConnectionState) => void;

    // Actions - Chat Mode
    setChatMode: (mode: 'direct' | 'tutor' | 'deep_think' | 'creative' | 'research') => void;
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

    // Actions - Comparison mode
    setComparisonMode: (enabled: boolean) => void;
    setSelectedModels: (models: [string, string]) => void;
    appendToSlot: (slot: 'A' | 'B', text: string, type?: 'content' | 'thinking') => void;
    markSlotComplete: (slot: 'A' | 'B') => void;
    clearComparison: () => void;
}

// Valid chat modes
const CHAT_MODES = ['direct', 'tutor', 'deep_think', 'creative', 'research'] as const;
type ChatMode = typeof CHAT_MODES[number];

// Load persisted chat mode from localStorage
const getPersistedChatMode = (): ChatMode => {
    if (typeof window === 'undefined') return 'tutor';
    const saved = localStorage.getItem('synapse-chat-mode');
    if (saved && CHAT_MODES.includes(saved as ChatMode)) {
        return saved as ChatMode;
    }
    return 'tutor';
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

    // Comparison mode initial values
    isComparisonMode: false,
    selectedModels: ['qwen3_next', 'deepseek_v3_1'],  // Default pair
    comparisonStreaming: {
        A: { content: '', thinking: '', isComplete: false },
        B: { content: '', thinking: '', isComplete: false },
    },

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
        const current = get().chatMode;
        const currentIndex = CHAT_MODES.indexOf(current);
        const nextIndex = (currentIndex + 1) % CHAT_MODES.length;
        const newMode = CHAT_MODES[nextIndex] ?? 'tutor';
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

    // Comparison mode actions
    setComparisonMode: (enabled) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('synapse-comparison-mode', String(enabled));
        }
        set({ isComparisonMode: enabled });
    },
    
    setSelectedModels: (models) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('synapse-comparison-models', JSON.stringify(models));
        }
        set({ selectedModels: models });
    },
    
    appendToSlot: (slot, text, type = 'content') => {
        set((state) => ({
            comparisonStreaming: {
                ...state.comparisonStreaming,
                [slot]: {
                    ...state.comparisonStreaming[slot],
                    [type]: state.comparisonStreaming[slot][type] + text,
                },
            },
        }));
    },
    
    markSlotComplete: (slot) => {
        set((state) => ({
            comparisonStreaming: {
                ...state.comparisonStreaming,
                [slot]: {
                    ...state.comparisonStreaming[slot],
                    isComplete: true,
                },
            },
        }));
    },
    
    clearComparison: () => {
        set({
            comparisonStreaming: {
                A: { content: '', thinking: '', isComplete: false },
                B: { content: '', thinking: '', isComplete: false },
            },
        });
    },
}));

