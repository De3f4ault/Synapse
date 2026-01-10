/**
 * Activity Store - Activity feed and session state
 * 
 * Owns:
 * - Activity feed display preferences
 * - Session tracking UI state
 * - Filter/sort preferences for timeline
 */

import { create } from "zustand";

// ============================================================
// Types
// ============================================================

export type ActivityFilterType = "all" | "flashcards" | "documents" | "notes" | "quizzes" | "chat";
export type ActivitySortOrder = "newest" | "oldest";

// ============================================================
// State
// ============================================================

interface ActivityState {
    // Display preferences
    filter: ActivityFilterType;
    sortOrder: ActivitySortOrder;
    maxItems: number;

    // Collapsed/expanded sections
    expandedSections: Set<string>;

    // Real-time updates
    isPaused: boolean; // Pause real-time updates
    lastViewedAt: number | null;
}

interface ActivityActions {
    // Display
    setFilter: (filter: ActivityFilterType) => void;
    setSortOrder: (order: ActivitySortOrder) => void;
    setMaxItems: (count: number) => void;

    // Sections
    toggleSection: (sectionId: string) => void;
    expandAll: () => void;
    collapseAll: () => void;

    // Real-time
    pause: () => void;
    resume: () => void;
    markViewed: () => void;

    // Reset
    reset: () => void;
}

// ============================================================
// Initial State
// ============================================================

const initialState: ActivityState = {
    filter: "all",
    sortOrder: "newest",
    maxItems: 20,
    expandedSections: new Set(),
    isPaused: false,
    lastViewedAt: null,
};

// ============================================================
// Store
// ============================================================

export const useActivityStore = create<ActivityState & ActivityActions>((set) => ({
    ...initialState,

    // Display
    setFilter: (filter) => set({ filter }),
    setSortOrder: (sortOrder) => set({ sortOrder }),
    setMaxItems: (maxItems) => set({ maxItems }),

    // Sections
    toggleSection: (sectionId) =>
        set((state) => {
            const newSections = new Set(state.expandedSections);
            if (newSections.has(sectionId)) {
                newSections.delete(sectionId);
            } else {
                newSections.add(sectionId);
            }
            return { expandedSections: newSections };
        }),
    expandAll: () => set({ expandedSections: new Set(["today", "yesterday", "week", "month"]) }),
    collapseAll: () => set({ expandedSections: new Set() }),

    // Real-time
    pause: () => set({ isPaused: true }),
    resume: () => set({ isPaused: false }),
    markViewed: () => set({ lastViewedAt: Date.now() }),

    // Reset
    reset: () => set(initialState),
}));

// ============================================================
// Selectors
// ============================================================

export const useActivityFilter = () => useActivityStore((s) => s.filter);
export const useActivitySortOrder = () => useActivityStore((s) => s.sortOrder);
export const useActivityMaxItems = () => useActivityStore((s) => s.maxItems);
export const useActivityPaused = () => useActivityStore((s) => s.isPaused);

export const useActivityActions = () =>
    useActivityStore((s) => ({
        setFilter: s.setFilter,
        setSortOrder: s.setSortOrder,
        setMaxItems: s.setMaxItems,
        toggleSection: s.toggleSection,
        expandAll: s.expandAll,
        collapseAll: s.collapseAll,
        pause: s.pause,
        resume: s.resume,
        markViewed: s.markViewed,
        reset: s.reset,
    }));
