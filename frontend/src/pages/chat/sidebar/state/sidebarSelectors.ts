/**
 * Sidebar Selectors - Derived State
 *
 * Fine-grained subscriptions for optimal re-renders.
 */

import { useSidebarStore } from './sidebarStore';

// Filter & Sort
export const useSessionFilter = () => useSidebarStore((s) => s.filter);
export const useSessionSort = () => useSidebarStore((s) => s.sort);

// Collapse
export const useIsSidebarCollapsed = () => useSidebarStore((s) => s.isCollapsed);

// Search
export const useSidebarSearchQuery = () => useSidebarStore((s) => s.searchQuery);

// Rename
export const useRenamingSessionId = () => useSidebarStore((s) => s.renamingSessionId);
export const useRenamingValue = () => useSidebarStore((s) => s.renamingValue);
export const useIsRenaming = () => useSidebarStore((s) => s.renamingSessionId !== null);

// Actions (stable references)
export const useSidebarActions = () =>
    useSidebarStore((s) => ({
        setFilter: s.setFilter,
        setSort: s.setSort,
        toggleCollapsed: s.toggleCollapsed,
        setCollapsed: s.setCollapsed,
        setSearchQuery: s.setSearchQuery,
        clearSearch: s.clearSearch,
        startRenaming: s.startRenaming,
        setRenamingValue: s.setRenamingValue,
        cancelRenaming: s.cancelRenaming,
        completeRenaming: s.completeRenaming,
        reset: s.reset,
    }));
