/**
 * Dashboard Store - Global invariants for the Dashboard module
 * 
 * This store owns:
 * - Time range (lens for filtering data)
 * - Workspace context (active module, deck, document)
 * - Filters (sort, search)
 * - Refresh semantics
 * 
 * This store does NOT own:
 * - Raw data (belongs to domain modules)
 * - Computed insights (belongs to insights store)
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
    type TimeRange,
    type TimeRangePreset,
    type WorkspaceContext,
    type DashboardFilters,
    type RefreshConfig,
    type ModuleFilter,
    createTimeRange,
} from "../engine";

// ============================================================
// State Types
// ============================================================

interface DashboardState {
    // Time range lens
    timeRange: TimeRange;

    // Workspace context
    workspace: WorkspaceContext;

    // Filters
    filters: DashboardFilters;

    // Refresh
    refresh: RefreshConfig;
}

interface DashboardActions {
    // Time range
    setTimeRange: (preset: TimeRangePreset) => void;
    setCustomTimeRange: (start: Date, end: Date) => void;

    // Workspace
    setActiveModule: (module: ModuleFilter | null) => void;
    setActiveDeck: (deckId: number | null) => void;
    setActiveDocument: (documentId: number | null) => void;
    clearWorkspace: () => void;

    // Filters
    setModuleFilter: (module: ModuleFilter | null) => void;
    setSearchQuery: (query: string) => void;
    setSortBy: (sortBy: DashboardFilters["sortBy"]) => void;
    setSortOrder: (order: DashboardFilters["sortOrder"]) => void;
    clearFilters: () => void;

    // Refresh
    setAutoRefresh: (enabled: boolean) => void;
    setRefreshInterval: (intervalMs: number) => void;
    markRefreshed: () => void;

    // Reset
    reset: () => void;
}

// ============================================================
// Initial State
// ============================================================

const initialTimeRange = createTimeRange("week");

const initialState: DashboardState = {
    timeRange: initialTimeRange,
    workspace: {
        activeModule: null,
        activeDeckId: null,
        activeDocumentId: null,
    },
    filters: {
        module: null,
        searchQuery: "",
        sortBy: "date",
        sortOrder: "desc",
    },
    refresh: {
        autoRefresh: true,
        intervalMs: 1000 * 60 * 5, // 5 minutes
        lastRefreshedAt: null,
    },
};

// ============================================================
// Storage Helper (Date Reviver)
// ============================================================

const storage = createJSONStorage(() => localStorage, {
    reviver: (key, value) => {
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return new Date(value);
        }
        return value;
    },
});

// ============================================================
// Store
// ============================================================

export const useDashboardStore = create<DashboardState & DashboardActions>()(
    persist(
        (set) => ({
            ...initialState,

            // Time range
            setTimeRange: (preset) => set({ timeRange: createTimeRange(preset) }),
            setCustomTimeRange: (start, end) =>
                set({
                    timeRange: {
                        preset: "all", // Custom range uses "all" as placeholder
                        start,
                        end,
                    },
                }),

            // Workspace
            setActiveModule: (module) =>
                set((state) => ({
                    workspace: { ...state.workspace, activeModule: module },
                })),
            setActiveDeck: (deckId) =>
                set((state) => ({
                    workspace: { ...state.workspace, activeDeckId: deckId },
                })),
            setActiveDocument: (documentId) =>
                set((state) => ({
                    workspace: { ...state.workspace, activeDocumentId: documentId },
                })),
            clearWorkspace: () =>
                set({
                    workspace: {
                        activeModule: null,
                        activeDeckId: null,
                        activeDocumentId: null,
                    },
                }),

            // Filters
            setModuleFilter: (module) =>
                set((state) => ({
                    filters: { ...state.filters, module },
                })),
            setSearchQuery: (searchQuery) =>
                set((state) => ({
                    filters: { ...state.filters, searchQuery },
                })),
            setSortBy: (sortBy) =>
                set((state) => ({
                    filters: { ...state.filters, sortBy },
                })),
            setSortOrder: (sortOrder) =>
                set((state) => ({
                    filters: { ...state.filters, sortOrder },
                })),
            clearFilters: () =>
                set({
                    filters: {
                        module: null,
                        searchQuery: "",
                        sortBy: "date",
                        sortOrder: "desc",
                    },
                }),

            // Refresh
            setAutoRefresh: (autoRefresh) =>
                set((state) => ({
                    refresh: { ...state.refresh, autoRefresh },
                })),
            setRefreshInterval: (intervalMs) =>
                set((state) => ({
                    refresh: { ...state.refresh, intervalMs },
                })),
            markRefreshed: () =>
                set((state) => ({
                    refresh: { ...state.refresh, lastRefreshedAt: Date.now() },
                })),

            // Reset
            reset: () => set(initialState),
        }),
        {
            name: "synapse-dashboard-core",
            storage,
            partialize: (state) => ({
                // Only persist user preferences
                timeRange: state.timeRange,
                filters: state.filters,
                refresh: {
                    autoRefresh: state.refresh.autoRefresh,
                    intervalMs: state.refresh.intervalMs,
                    lastRefreshedAt: null, // Don't persist this
                },
            }),
        }
    )
);

// ============================================================
// Selectors
// ============================================================

export const useTimeRange = () => useDashboardStore((s) => s.timeRange);
export const useWorkspace = () => useDashboardStore((s) => s.workspace);
export const useDashboardFilters = () => useDashboardStore((s) => s.filters);
export const useRefreshConfig = () => useDashboardStore((s) => s.refresh);

// Action selectors
export const useTimeRangeActions = () =>
    useDashboardStore((s) => ({
        setTimeRange: s.setTimeRange,
        setCustomTimeRange: s.setCustomTimeRange,
    }));

export const useWorkspaceActions = () =>
    useDashboardStore((s) => ({
        setActiveModule: s.setActiveModule,
        setActiveDeck: s.setActiveDeck,
        setActiveDocument: s.setActiveDocument,
        clearWorkspace: s.clearWorkspace,
    }));

export const useFilterActions = () =>
    useDashboardStore((s) => ({
        setModuleFilter: s.setModuleFilter,
        setSearchQuery: s.setSearchQuery,
        setSortBy: s.setSortBy,
        setSortOrder: s.setSortOrder,
        clearFilters: s.clearFilters,
    }));

export const useRefreshActions = () =>
    useDashboardStore((s) => ({
        setAutoRefresh: s.setAutoRefresh,
        setRefreshInterval: s.setRefreshInterval,
        markRefreshed: s.markRefreshed,
    }));
