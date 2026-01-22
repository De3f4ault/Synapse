/**
 * Thread Store - Thread Context State
 *
 * INVARIANT: Thread context is orthogonal to chat streaming state.
 * Thread state controls WHICH context is active, not HOW streaming works.
 *
 * Contract: ChatContext
 * - mode: 'main' → main conversation (thread_id = NULL)
 * - mode: 'thread' → thread conversation (thread_id = X)
 *
 * This separation is critical for:
 * - AI suggestions ("where am I?")
 * - WebSocket routing divergence (future)
 * - Clean mental model for users
 */

import { create } from 'zustand';

export interface ThreadInfo {
    id: number;
    sessionId: number;
    title: string;
    summary?: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

export type ChatContext =
    | { mode: 'main' }
    | { mode: 'thread'; threadId: number; thread?: ThreadInfo };

interface ThreadState {
    // Current context
    context: ChatContext;

    // Thread panel visibility
    isPanelOpen: boolean;

    // Threads list for current session
    threads: ThreadInfo[];
    isLoadingThreads: boolean;

    // Actions - Context
    switchToMain: () => void;
    switchToThread: (threadId: number, thread?: ThreadInfo) => void;

    // Actions - Panel
    openPanel: () => void;
    closePanel: () => void;
    togglePanel: () => void;

    // Actions - Threads list
    setThreads: (threads: ThreadInfo[]) => void;
    addThread: (thread: ThreadInfo) => void;
    updateThread: (threadId: number, updates: Partial<ThreadInfo>) => void;
    removeThread: (threadId: number) => void;
    setLoadingThreads: (loading: boolean) => void;

    // Actions - Reset
    reset: () => void;
}

export const useThreadStore = create<ThreadState>((set) => ({
    // Initial state
    context: { mode: 'main' },
    isPanelOpen: false,
    threads: [],
    isLoadingThreads: false,

    // Context switching
    switchToMain: () => set({ context: { mode: 'main' } }),

    switchToThread: (threadId, thread) => set({
        context: { mode: 'thread', threadId, thread },
    }),

    // Panel controls
    openPanel: () => set({ isPanelOpen: true }),
    closePanel: () => set({ isPanelOpen: false }),
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

    // Threads list management
    setThreads: (threads) => set({ threads }),

    addThread: (thread) => set((state) => ({
        threads: [thread, ...state.threads],
    })),

    updateThread: (threadId, updates) => set((state) => ({
        threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, ...updates } : t
        ),
    })),

    removeThread: (threadId) => set((state) => ({
        threads: state.threads.filter((t) => t.id !== threadId),
        // If we were viewing this thread, switch back to main
        context: state.context.mode === 'thread' && state.context.threadId === threadId
            ? { mode: 'main' }
            : state.context,
    })),

    setLoadingThreads: (isLoadingThreads) => set({ isLoadingThreads }),

    // Full reset (on session change)
    reset: () => set({
        context: { mode: 'main' },
        isPanelOpen: false,
        threads: [],
        isLoadingThreads: false,
    }),
}));

// Selector: Check if in thread mode
export const useIsInThread = () =>
    useThreadStore((state) => state.context.mode === 'thread');

// Selector: Get current thread ID if in thread mode
export const useCurrentThreadId = () =>
    useThreadStore((state) =>
        state.context.mode === 'thread' ? state.context.threadId : null
    );

// Selector: Get current thread info if available
export const useCurrentThread = () =>
    useThreadStore((state) =>
        state.context.mode === 'thread' ? state.context.thread : null
    );
