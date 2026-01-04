/**
 * useDashboardContext - Hook for consuming dashboard context
 * 
 * This hook provides a unified interface ко the dashboard's global invariants.
 */

import {
    useTimeRange,
    useWorkspace,
    useDashboardFilters,
    useRefreshConfig,
    useTimeRangeActions,
    useWorkspaceActions,
    useFilterActions,
    useRefreshActions,
} from "../state";

export function useDashboardContext() {
    const timeRange = useTimeRange();
    const workspace = useWorkspace();
    const filters = useDashboardFilters();
    const refresh = useRefreshConfig();

    const timeRangeActions = useTimeRangeActions();
    const workspaceActions = useWorkspaceActions();
    const filterActions = useFilterActions();
    const refreshActions = useRefreshActions();

    return {
        // State
        timeRange,
        workspace,
        filters,
        refresh,

        // Actions
        ...timeRangeActions,
        ...workspaceActions,
        ...filterActions,
        ...refreshActions,
    };
}
