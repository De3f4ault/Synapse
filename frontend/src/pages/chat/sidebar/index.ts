/**
 * Sidebar Module - Public API
 *
 * INVARIANT:
 * Sessions are server-authoritative (React Query).
 * Sidebar UI state (filter, collapsed, renaming) is ephemeral.
 *
 * This is the ONLY entry point for the sidebar module.
 * No deep imports across modules allowed.
 */

// Components
export { ChatSidebar } from './components';

// Hooks
export {
    useChatSessions,
    useChatSession,
    useCreateSession,
    useUpdateSession,
    useDeleteSession,
    sessionKeys,
} from './hooks';

// State (selectors only - store internals are private)
export { useSidebarStore } from './state/sidebarStore';
export {
    useSessionFilter,
    useSessionSort,
    useIsSidebarCollapsed,
    useSidebarSearchQuery,
    useRenamingSessionId,
    useRenamingValue,
    useIsRenaming,
    useSidebarActions,
} from './state/sidebarSelectors';

// Engine types (for external typing only)
export type {
    SessionFilter,
    SessionSort,
    SidebarUIState,
} from './engine/types';
