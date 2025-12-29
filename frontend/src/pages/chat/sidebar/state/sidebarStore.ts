/**
 * Sidebar Store - UI State Only
 *
 * INVARIANT:
 * This store is the single authority for sidebar UI state.
 * UI and hooks must never derive parallel state.
 *
 * Session data is server-authoritative (React Query).
 * This store owns ONLY ephemeral UI concerns:
 * - Filter/sort selection
 * - Collapsed state
 * - Search query
 * - Renaming state
 */

import { create } from 'zustand';
import {
    SessionFilter,
    SessionSort,
    INITIAL_SIDEBAR_STATE,
} from '../engine/types';

interface SidebarStoreState {
    // Filter & sort
    filter: SessionFilter;
    sort: SessionSort;

    // Collapse state
    isCollapsed: boolean;

    // Local search (client-side filter)
    searchQuery: string;

    // Rename modal state
    renamingSessionId: number | null;
    renamingValue: string;

    // Actions - Filter & Sort
    setFilter: (filter: SessionFilter) => void;
    setSort: (sort: SessionSort) => void;

    // Actions - Collapse
    toggleCollapsed: () => void;
    setCollapsed: (collapsed: boolean) => void;

    // Actions - Search
    setSearchQuery: (query: string) => void;
    clearSearch: () => void;

    // Actions - Rename
    startRenaming: (sessionId: number, currentTitle: string) => void;
    setRenamingValue: (value: string) => void;
    cancelRenaming: () => void;
    completeRenaming: () => void;

    // Actions - Reset
    reset: () => void;
}

export const useSidebarStore = create<SidebarStoreState>((set) => ({
    // Initial state
    ...INITIAL_SIDEBAR_STATE,

    // Filter & Sort
    setFilter: (filter) => set({ filter }),
    setSort: (sort) => set({ sort }),

    // Collapse
    toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
    setCollapsed: (isCollapsed) => set({ isCollapsed }),

    // Search
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    clearSearch: () => set({ searchQuery: '' }),

    // Rename
    startRenaming: (sessionId, currentTitle) =>
        set({
            renamingSessionId: sessionId,
            renamingValue: currentTitle,
        }),
    setRenamingValue: (renamingValue) => set({ renamingValue }),
    cancelRenaming: () =>
        set({
            renamingSessionId: null,
            renamingValue: '',
        }),
    completeRenaming: () =>
        set({
            renamingSessionId: null,
            renamingValue: '',
        }),

    // Reset
    reset: () => set(INITIAL_SIDEBAR_STATE),
}));
