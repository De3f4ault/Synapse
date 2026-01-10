/**
 * List Store - State for document list view
 *
 * Owns: view mode, filters, sorting
 * Does NOT own: which document is active (that's core)
 */

import { create } from "zustand";
import type { DocumentFilters } from "../../core";
import { DEFAULT_FILTERS } from "../../core";

export type ViewMode = "grid" | "list";

interface ListState {
    viewMode: ViewMode;
    filters: DocumentFilters;

    // Actions
    setViewMode: (mode: ViewMode) => void;
    setFilters: (filters: Partial<DocumentFilters>) => void;
    setSearch: (search: string) => void;
    setSector: (sector: DocumentFilters["sector"]) => void;
    resetFilters: () => void;
}

export const useListStore = create<ListState>((set) => ({
    // Initial state
    viewMode: "grid",
    filters: DEFAULT_FILTERS,

    // View mode
    setViewMode: (viewMode) => set({ viewMode }),

    // Filter actions
    setFilters: (newFilters) =>
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        })),

    setSearch: (search) =>
        set((state) => ({
            filters: { ...state.filters, search },
        })),

    setSector: (sector) =>
        set((state) => ({
            filters: { ...state.filters, sector },
        })),

    resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
