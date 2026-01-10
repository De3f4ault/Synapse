/**
 * Assistant Store - State management for Dashboard Assistant
 * 
 * The store owns:
 * - UI state (open, minimized, sidebar visibility)
 * - Session state (current session ID, sessions list)
 * - Message state (messages, typing indicator)
 * 
 * The store does NOT own:
 * - API calls (handled by hooks)
 * - Complex send logic (handled by hooks)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// Types
// ============================================================

export interface UIMessage {
    id: string | number;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: string;
    actions?: Array<{
        type: string;
        data: Record<string, unknown>;
        message: string;
    }>;
}

export interface AssistantSession {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
}

interface AssistantState {
    // UI State
    isOpen: boolean;
    isMinimized: boolean;
    showSidebar: boolean;

    // Session State
    sessionId: number | null;
    sessions: AssistantSession[];
    isInitializing: boolean;

    // Message State
    messages: UIMessage[];
    isTyping: boolean;
    historyLoaded: boolean;
}

interface AssistantActions {
    // UI Actions
    open: () => void;
    close: () => void;
    minimize: () => void;
    restore: () => void;
    toggleSidebar: () => void;

    // Session Actions
    setSessionId: (id: number | null) => void;
    setSessions: (sessions: AssistantSession[]) => void;
    addSession: (session: AssistantSession) => void;
    removeSession: (id: number) => void;
    setInitializing: (value: boolean) => void;

    // Message Actions
    setMessages: (messages: UIMessage[]) => void;
    addMessage: (message: UIMessage) => void;
    setTyping: (value: boolean) => void;
    setHistoryLoaded: (value: boolean) => void;

    // Reset
    reset: () => void;
}

// ============================================================
// Constants
// ============================================================

const WELCOME_MESSAGE: UIMessage = {
    role: "assistant",
    content:
        "Hello! I'm monitoring your learning progress. Ask me about your weak areas or what to study next.",
    id: "init",
    timestamp: new Date().toISOString(),
};

const initialState: AssistantState = {
    isOpen: false,
    isMinimized: false,
    showSidebar: true,
    sessionId: null,
    sessions: [],
    isInitializing: true,
    messages: [WELCOME_MESSAGE],
    isTyping: false,
    historyLoaded: false,
};

// ============================================================
// Store
// ============================================================

export const useAssistantStore = create<AssistantState & AssistantActions>()(
    persist(
        (set, _get) => ({
            ...initialState,

            // UI Actions
            open: () => set({ isOpen: true, isMinimized: false }),
            close: () => set({ isOpen: false }),
            minimize: () => set({ isMinimized: true }),
            restore: () => set({ isMinimized: false }),
            toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),

            // Session Actions
            setSessionId: (id) => set({ sessionId: id }),
            setSessions: (sessions) => set({ sessions }),
            addSession: (session) =>
                set((state) => ({ sessions: [session, ...state.sessions] })),
            removeSession: (id) =>
                set((state) => ({
                    sessions: state.sessions.filter((s) => s.id !== id),
                })),
            setInitializing: (value) => set({ isInitializing: value }),

            // Message Actions
            setMessages: (messages) => set({ messages }),
            addMessage: (message) =>
                set((state) => ({ messages: [...state.messages, message] })),
            setTyping: (value) => set({ isTyping: value }),
            setHistoryLoaded: (value) => set({ historyLoaded: value }),

            // Reset
            reset: () => set({ ...initialState, isOpen: false }),
        }),
        {
            name: "synapse-dashboard-assistant",
            partialize: (state) => ({
                // Only persist UI preferences and session ID
                showSidebar: state.showSidebar,
                sessionId: state.sessionId,
            }),
        }
    )
);

// ============================================================
// Selectors
// ============================================================

export const useAssistantOpen = () => useAssistantStore((s) => s.isOpen);
export const useAssistantMinimized = () => useAssistantStore((s) => s.isMinimized);
export const useAssistantSidebar = () => useAssistantStore((s) => s.showSidebar);
export const useAssistantSessionId = () => useAssistantStore((s) => s.sessionId);
export const useAssistantSessions = () => useAssistantStore((s) => s.sessions);
export const useAssistantMessages = () => useAssistantStore((s) => s.messages);
export const useAssistantTyping = () => useAssistantStore((s) => s.isTyping);
export const useAssistantInitializing = () => useAssistantStore((s) => s.isInitializing);
export const useAssistantActions = () => {
    const s = useAssistantStore.getState();
    return {
        open: s.open,
        close: s.close,
        minimize: s.minimize,
        restore: s.restore,
        toggleSidebar: s.toggleSidebar,
        setSessionId: s.setSessionId,
        setSessions: s.setSessions,
        addSession: s.addSession,
        removeSession: s.removeSession,
        setInitializing: s.setInitializing,
        setMessages: s.setMessages,
        addMessage: s.addMessage,
        setTyping: s.setTyping,
        setHistoryLoaded: s.setHistoryLoaded,
        reset: s.reset,
    };
};

// Export welcome message for use in hooks
export { WELCOME_MESSAGE };
