/**
 * Deck List Store
 * 
 * Manages UI state for deck discovery and management.
 * Persists view mode preference to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==================== TYPES ====================

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'created' | 'updated' | 'cards';
export type SortOrder = 'asc' | 'desc';

interface DeckListStoreState {
    viewMode: ViewMode;
    sortBy: SortBy;
    sortOrder: SortOrder;
    searchQuery: string;
    listError: string | null;
}

interface DeckListStoreActions {
    setViewMode: (mode: ViewMode) => void;
    setSortBy: (sortBy: SortBy) => void;
    setSortOrder: (order: SortOrder) => void;
    setSearchQuery: (query: string) => void;
    setListError: (error: string | null) => void;
    clearListError: () => void;
}

type DeckListStore = DeckListStoreState & DeckListStoreActions;

// ==================== STORE ====================

export const useDeckListStore = create<DeckListStore>()(
    persist(
        (set) => ({
            // Initial state
            viewMode: 'grid',
            sortBy: 'updated',
            sortOrder: 'desc',
            searchQuery: '',
            listError: null,

            // Actions
            setViewMode: (mode) => set({ viewMode: mode }),
            setSortBy: (sortBy) => set({ sortBy }),
            setSortOrder: (order) => set({ sortOrder: order }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setListError: (error) => set({ listError: error }),
            clearListError: () => set({ listError: null }),
        }),
        {
            name: 'flashcards-deck-list',
            partialize: (state) => ({
                viewMode: state.viewMode,
                sortBy: state.sortBy,
                sortOrder: state.sortOrder,
            }),
        }
    )
);

// ==================== SELECTORS ====================

export const selectViewMode = (state: DeckListStore) => state.viewMode;
export const selectSortBy = (state: DeckListStore) => state.sortBy;
export const selectSortOrder = (state: DeckListStore) => state.sortOrder;
export const selectSearchQuery = (state: DeckListStore) => state.searchQuery;
export const selectListError = (state: DeckListStore) => state.listError;
