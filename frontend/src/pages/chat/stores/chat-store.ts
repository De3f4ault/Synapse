/**
 * Chat Store - Zustand state management for chat UI
 * Adapted from stray chat folder for Synapse backend integration
 */

import { create } from 'zustand';
import type { ChatSessionResponse } from '@/api/generated';

interface ChatState {
    sessions: ChatSessionResponse[];
    selectedSessionId: number | null;
    setSessions: (sessions: ChatSessionResponse[]) => void;
    selectSession: (sessionId: number) => void;
    archiveSession: (sessionId: number) => void;
    unarchiveSession: (sessionId: number) => void;
    deleteSession: (sessionId: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    sessions: [],
    selectedSessionId: null,

    setSessions: (sessions) => set({ sessions }),

    selectSession: (sessionId) => set({ selectedSessionId: sessionId }),

    archiveSession: (sessionId) =>
        set((state) => ({
            sessions: state.sessions.map((session) =>
                session.id === sessionId
                    ? { ...session, archived: true }
                    : session
            ),
        })),

    unarchiveSession: (sessionId) =>
        set((state) => ({
            sessions: state.sessions.map((session) =>
                session.id === sessionId
                    ? { ...session, archived: false }
                    : session
            ),
        })),

    deleteSession: (sessionId) =>
        set((state) => ({
            sessions: state.sessions.filter((session) => session.id !== sessionId),
            selectedSessionId:
                state.selectedSessionId === sessionId ? null : state.selectedSessionId,
        })),
}));
