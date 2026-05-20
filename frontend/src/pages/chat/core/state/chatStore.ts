/**
 * Chat Store — User Preferences & UI State
 *
 * Pure Vercel architecture: streaming state is owned by the SDK.
 * This store persists user preferences and UI state that outlives a stream.
 *
 * Surviving real state:
 * - chatMode / selectedModel  → body params sent with every stream request
 * - isComparisonMode          → parallel model comparison UI
 * - error                     → last stream error for display
 *
 * Deprecated stubs (marked @deprecated):
 * These were soft-deleted in the Pure Vercel migration but kept as no-ops
 * so existing callers (useRegenerate, chatSelectors) continue to compile.
 * Remove once each caller is refactored.
 */

import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────────────────

const CHAT_MODES = ['direct', 'tutor', 'deep_think', 'creative', 'research'] as const;
type ChatMode = typeof CHAT_MODES[number];
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

/** @deprecated Kept for backward compat only — SDK owns streaming state */
interface StreamingState {
  content: string;
  thinking: string;
  model: string;
  sources: unknown[];
  isStreaming: boolean;
}

/** @deprecated Kept for backward compat only */
interface ToolCall {
  name: string;
  status: 'pending' | 'executing' | 'done' | 'error';
  [key: string]: unknown;
}

const EMPTY_STREAMING: StreamingState = {
  content: '', thinking: '', model: '', sources: [], isStreaming: false,
};

interface ChatState {
  // ── Real preferences ──────────────────────────────────────────────────────
  chatMode: ChatMode;
  selectedModel: string | null;
  error: string | null;

  // ── Comparison mode ───────────────────────────────────────────────────────
  isComparisonMode: boolean;
  selectedModels: [string, string];
  comparisonStreaming: {
    A: { content: string; thinking: string; isComplete: boolean };
    B: { content: string; thinking: string; isComplete: boolean };
  };

  // ── Deprecated: connection / streaming state stubs ────────────────────────
  /** @deprecated SDK owns connection state */
  connectionState: ConnectionState;
  /** @deprecated SDK owns streaming state */
  streaming: StreamingState;
  /** @deprecated SDK owns tool call state */
  toolCalls: ToolCall[];

  // ── Real actions ──────────────────────────────────────────────────────────
  setChatMode: (mode: ChatMode) => void;
  toggleChatMode: () => void;
  setSelectedModel: (model: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setComparisonMode: (enabled: boolean) => void;
  setSelectedModels: (models: [string, string]) => void;
  appendToSlot: (slot: 'A' | 'B', text: string, type?: 'content' | 'thinking') => void;
  markSlotComplete: (slot: 'A' | 'B') => void;
  clearComparison: () => void;


  // ── Deprecated no-op stubs ────────────────────────────────────────────────
  /** @deprecated no-op */
  setConnectionState: (state: ConnectionState) => void;
  /** @deprecated no-op — SDK handles streaming */
  appendContent: (text: string) => void;
  /** @deprecated no-op — SDK handles streaming */
  appendThinking: (text: string) => void;
  /** @deprecated no-op */
  setModel: (model: string) => void;
  /** @deprecated no-op */
  setSources: (sources: unknown[]) => void;
  /** @deprecated no-op — SDK handles streaming */
  setIsStreaming: (isStreaming: boolean) => void;
  /** @deprecated no-op */
  clearStreaming: () => void;
  /** @deprecated no-op */
  addToolCall: (call: ToolCall) => void;
  /** @deprecated no-op */
  updateToolCall: (name: string, updates: Partial<ToolCall>) => void;
  /** @deprecated no-op */
  clearToolCalls: () => void;
  /** @deprecated clears error only */
  reset: () => void;
  /** @deprecated clears error only — SDK handles session state */
  resetForSession: (sessionId: number) => void;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const ls = {
  get: (key: string) => (typeof window !== 'undefined' ? localStorage.getItem(key) : null),
  set: (key: string, val: string) => typeof window !== 'undefined' && localStorage.setItem(key, val),
  del: (key: string) => typeof window !== 'undefined' && localStorage.removeItem(key),
};

const getPersistedMode = (): ChatMode => {
  const saved = ls.get('synapse-chat-mode');
  return saved && CHAT_MODES.includes(saved as ChatMode) ? (saved as ChatMode) : 'tutor';
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  // ── Real state ────────────────────────────────────────────────────────────
  chatMode: getPersistedMode(),
  selectedModel: ls.get('synapse-selected-model'),
  error: null,
  isComparisonMode: false,
  selectedModels: ['qwen3_next', 'deepseek_v3_1'],
  comparisonStreaming: {
    A: { content: '', thinking: '', isComplete: false },
    B: { content: '', thinking: '', isComplete: false },
  },

  // ── Deprecated state stubs ────────────────────────────────────────────────
  connectionState: 'disconnected',
  streaming: EMPTY_STREAMING,
  toolCalls: [],

  // ── Real actions ──────────────────────────────────────────────────────────
  setChatMode: (chatMode) => { ls.set('synapse-chat-mode', chatMode); set({ chatMode }); },
  toggleChatMode: () => {
    const next = CHAT_MODES[(CHAT_MODES.indexOf(get().chatMode) + 1) % CHAT_MODES.length] ?? 'tutor';
    ls.set('synapse-chat-mode', next);
    set({ chatMode: next });
  },
  setSelectedModel: (model) => {
    model ? ls.set('synapse-selected-model', model) : ls.del('synapse-selected-model');
    set({ selectedModel: model });
  },
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setComparisonMode: (enabled) => { ls.set('synapse-comparison-mode', String(enabled)); set({ isComparisonMode: enabled }); },
  setSelectedModels: (models) => { ls.set('synapse-comparison-models', JSON.stringify(models)); set({ selectedModels: models }); },
  appendToSlot: (slot, text, type = 'content') =>
    set((state) => ({
      comparisonStreaming: {
        ...state.comparisonStreaming,
        [slot]: { ...state.comparisonStreaming[slot], [type]: state.comparisonStreaming[slot][type] + text },
      },
    })),
  markSlotComplete: (slot) =>
    set((state) => ({
      comparisonStreaming: {
        ...state.comparisonStreaming,
        [slot]: { ...state.comparisonStreaming[slot], isComplete: true },
      },
    })),
  clearComparison: () =>
    set({ comparisonStreaming: { A: { content: '', thinking: '', isComplete: false }, B: { content: '', thinking: '', isComplete: false } } }),


  // ── Deprecated no-op stubs (safe to call, do nothing) ────────────────────
  setConnectionState: () => {},
  appendContent: () => {},
  appendThinking: () => {},
  setModel: () => {},
  setSources: () => {},
  setIsStreaming: () => {},
  clearStreaming: () => {},
  addToolCall: () => {},
  updateToolCall: () => {},
  clearToolCalls: () => {},
  reset: () => set({ error: null }),
  resetForSession: () => set({ error: null }),
}));
