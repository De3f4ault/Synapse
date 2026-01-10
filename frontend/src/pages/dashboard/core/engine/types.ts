/**
 * Core Engine Types
 * 
 * Global invariants for the Dashboard module.
 * These define the "lens" through which data is viewed.
 */

// ============================================================
// Time Range
// ============================================================

export type TimeRangePreset = "today" | "week" | "month" | "quarter" | "year" | "all";

export interface TimeRange {
    preset: TimeRangePreset;
    start: Date;
    end: Date;
}

/**
 * Create a TimeRange from a preset
 */
export function createTimeRange(preset: TimeRangePreset): TimeRange {
    const end = new Date();
    let start: Date;

    switch (preset) {
        case "today":
            start = new Date();
            start.setHours(0, 0, 0, 0);
            break;
        case "week":
            start = new Date();
            start.setDate(start.getDate() - 7);
            break;
        case "month":
            start = new Date();
            start.setMonth(start.getMonth() - 1);
            break;
        case "quarter":
            start = new Date();
            start.setMonth(start.getMonth() - 3);
            break;
        case "year":
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
            break;
        case "all":
        default:
            start = new Date(0); // Unix epoch
            break;
    }

    return { preset, start, end };
}

// ============================================================
// Workspace Context
// ============================================================

export interface WorkspaceContext {
    activeModule: ModuleFilter | null;
    activeDeckId: number | null;
    activeDocumentId: number | null;
}

// ============================================================
// Filters
// ============================================================

export type ModuleFilter = "flashcards" | "documents" | "notes" | "quizzes" | "chat";

export interface DashboardFilters {
    module: ModuleFilter | null;
    searchQuery: string;
    sortBy: "date" | "priority" | "name";
    sortOrder: "asc" | "desc";
}

// ============================================================
// Refresh Semantics
// ============================================================

export interface RefreshConfig {
    autoRefresh: boolean;
    intervalMs: number;
    lastRefreshedAt: number | null;
}

// ============================================================
// Combined Dashboard Context
// ============================================================

export interface DashboardContext {
    timeRange: TimeRange;
    workspace: WorkspaceContext;
    filters: DashboardFilters;
    refresh: RefreshConfig;
}
