/**
 * Notes Module - List Store
 * Manages list view state: view mode, filters, tree expansion, selection.
 *
 * PATTERN: expandedIds stored as number[] for safe persistence (Sets don't serialize).
 */

import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { ViewMode } from "../../core";

// ============================================================================
// Store State
// ============================================================================

interface ListState {
    // View configuration
    viewMode: ViewMode;

    // Search
    searchQuery: string;

    // Filters
    filterTags: string[];

    // Tree navigation (stored as array for persistence)
    expandedIds: number[];
    selectedId: number | null;

    // Actions
    setViewMode: (mode: ViewMode) => void;
    setSearchQuery: (query: string) => void;
    setFilterTags: (tags: string[]) => void;
    toggleExpanded: (id: number) => void;
    expandAll: (ids: number[]) => void;
    collapseAll: () => void;
    setSelectedId: (id: number | null) => void;
    reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
    viewMode: "tree" as ViewMode,
    searchQuery: "",
    filterTags: [],
    expandedIds: [],
    selectedId: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useListStore = create<ListState>()(
    devtools(
        persist(
            (set) => ({
                ...initialState,

                setViewMode: (mode) =>
                    set({ viewMode: mode }, false, "setViewMode"),

                setSearchQuery: (query) =>
                    set({ searchQuery: query }, false, "setSearchQuery"),

                setFilterTags: (tags) =>
                    set({ filterTags: tags }, false, "setFilterTags"),

                toggleExpanded: (id) =>
                    set(
                        (state) => {
                            const isExpanded = state.expandedIds.includes(id);
                            return {
                                expandedIds: isExpanded
                                    ? state.expandedIds.filter((i) => i !== id)
                                    : [...state.expandedIds, id],
                            };
                        },
                        false,
                        "toggleExpanded"
                    ),

                expandAll: (ids) =>
                    set(
                        (state) => ({
                            expandedIds: [...new Set([...state.expandedIds, ...ids])],
                        }),
                        false,
                        "expandAll"
                    ),

                collapseAll: () =>
                    set({ expandedIds: [] }, false, "collapseAll"),

                setSelectedId: (id) =>
                    set({ selectedId: id }, false, "setSelectedId"),

                reset: () =>
                    set(initialState, false, "reset"),
            }),
            {
                name: "notes-list-preferences",
                // Only persist view preferences, not transient state
                partialize: (state) => ({
                    viewMode: state.viewMode,
                    expandedIds: state.expandedIds,
                }),
            }
        ),
        { name: "notes-list-store" }
    )
);

// ============================================================================
// Selector Helpers
// ============================================================================

/**
 * Check if a note is expanded (for tree view).
 */
export function useIsExpanded(id: number): boolean {
    return useListStore((state) => state.expandedIds.includes(id));
}

/**
 * Check if a note is selected.
 */
export function useIsSelected(id: number): boolean {
    return useListStore((state) => state.selectedId === id);
}

/**
 * Get expanded IDs array (for tree view).
 * Use useMemo to convert to Set at component level if needed.
 */
export function useExpandedIds(): number[] {
    return useListStore((state) => state.expandedIds);
}
