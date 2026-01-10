/**
 * Search Store - Single Source of Truth
 *
 * INVARIANT:
 * This store is the sole authority for search state.
 * Other modules may read via selectors but MUST NOT mutate directly.
 *
 * INVARIANT:
 * This store is the single authority for this domain.
 * UI and hooks must never derive parallel state.
 *
 * CONTRACT: Session Boundary
 * `resetForSession` MUST be idempotent (safe to call multiple times with same sessionId).
 */

import { create } from 'zustand';
import { SearchMatch, SearchIndex, SearchOptions, DEFAULT_SEARCH_OPTIONS } from '../engine/types';

interface SearchState {
    // Query state
    query: string;
    options: SearchOptions;

    // Index state
    index: SearchIndex | null;

    // Results state
    results: SearchMatch[];
    activeResultIndex: number;

    // UI state
    isSearching: boolean;
    isOpen: boolean;

    // Error ownership (Contract #3)
    error: string | null;

    // Session tracking
    currentSessionId: number | null;

    // Actions
    setQuery: (query: string) => void;
    setOptions: (options: Partial<SearchOptions>) => void;
    setIndex: (index: SearchIndex) => void;
    setResults: (results: SearchMatch[]) => void;
    setActiveResultIndex: (index: number) => void;
    setIsOpen: (isOpen: boolean) => void;
    setIsSearching: (isSearching: boolean) => void;

    // Error ownership
    setError: (error: string | null) => void;
    clearError: () => void;

    // Navigation
    nextResult: () => void;
    prevResult: () => void;

    // Reset
    reset: () => void;
    clearResults: () => void;

    // Session boundary (Contract #1)
    resetForSession: (sessionId: number) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
    // Initial state
    query: '',
    options: DEFAULT_SEARCH_OPTIONS,
    index: null,
    results: [],
    activeResultIndex: -1,
    isSearching: false,
    isOpen: false,
    error: null,
    currentSessionId: null,

    // Setters
    setQuery: (query) => set({ query }),
    setOptions: (options) => set((state) => ({ options: { ...state.options, ...options } })),
    setIndex: (index) => set({ index }),
    setResults: (results) =>
        set({
            results,
            activeResultIndex: results.length > 0 ? 0 : -1,
            isSearching: false,
        }),
    setActiveResultIndex: (activeResultIndex) => set({ activeResultIndex }),
    setIsOpen: (isOpen) => set({ isOpen }),
    setIsSearching: (isSearching) => set({ isSearching }),

    // Error ownership
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Navigation
    nextResult: () => {
        const { results, activeResultIndex } = get();
        if (results.length === 0) return;
        set({ activeResultIndex: (activeResultIndex + 1) % results.length });
    },
    prevResult: () => {
        const { results, activeResultIndex } = get();
        if (results.length === 0) return;
        set({
            activeResultIndex: activeResultIndex <= 0 ? results.length - 1 : activeResultIndex - 1,
        });
    },

    // Reset
    reset: () =>
        set({
            query: '',
            options: DEFAULT_SEARCH_OPTIONS,
            index: null,
            results: [],
            activeResultIndex: -1,
            isSearching: false,
            isOpen: false,
            error: null,
            currentSessionId: null,
        }),
    clearResults: () =>
        set({
            results: [],
            activeResultIndex: -1,
            isSearching: false,
        }),

    // Session boundary - idempotent reset for session change
    resetForSession: (sessionId) => {
        const state = get();
        // Idempotent: skip if same session
        if (state.currentSessionId === sessionId) {
            return;
        }
        set({
            query: '',
            index: null,
            results: [],
            activeResultIndex: -1,
            isSearching: false,
            isOpen: false,
            error: null,
            currentSessionId: sessionId,
        });
    },
}));

