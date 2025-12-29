/**
 * Sidebar Engine Types
 *
 * INVARIANT:
 * Sessions are server-authoritative (React Query).
 * Sidebar UI state (filter, collapsed, renaming) is ephemeral client state.
 *
 * These types are pure data structures.
 * No React, no DOM, no side-effects.
 */

/**
 * Session filter options
 */
export type SessionFilter = 'all' | 'recent' | 'archived' | 'dashboard';

/**
 * Sort options for session list
 */
export type SessionSort = 'updated' | 'created' | 'title';

/**
 * Sidebar UI state (ephemeral)
 */
export interface SidebarUIState {
    filter: SessionFilter;
    sort: SessionSort;
    isCollapsed: boolean;
    searchQuery: string;
    renamingSessionId: number | null;
    renamingValue: string;
}

/**
 * Initial sidebar UI state
 */
export const INITIAL_SIDEBAR_STATE: SidebarUIState = {
    filter: 'all',
    sort: 'updated',
    isCollapsed: false,
    searchQuery: '',
    renamingSessionId: null,
    renamingValue: '',
};
