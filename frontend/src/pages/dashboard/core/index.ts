/**
 * Core Module - Public API
 * 
 * This is the ONLY entry point for the core module.
 * No deep imports across modules allowed.
 * 
 * Architecture:
 * - engine/ → Type definitions for global invariants
 * - state/  → Zustand store for dashboard context
 * - hooks/  → Context consumption hooks
 * - DashboardProviders.tsx → Cross-module coordination
 * 
 * The core module owns global invariants (time range, filters, workspace).
 * It does NOT own data - that belongs to domain modules.
 */

// Provider (primary export)
export { DashboardProviders } from "./DashboardProviders";

// Hooks
export { useDashboardContext } from "./hooks";

// State (selectors)
export {
    useDashboardStore,
    useTimeRange,
    useWorkspace,
    useDashboardFilters,
    useRefreshConfig,
    useTimeRangeActions,
    useWorkspaceActions,
    useFilterActions,
    useRefreshActions,
} from "./state";

// Engine types
export type {
    TimeRangePreset,
    TimeRange,
    WorkspaceContext,
    ModuleFilter,
    DashboardFilters,
    RefreshConfig,
    DashboardContext,
} from "./engine";

export { createTimeRange } from "./engine";
