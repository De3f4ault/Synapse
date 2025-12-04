import type { QueueItem, PriorityLevel, ModuleType } from './dashboard.types';

/**
 * Queue section grouping
 * FIXED: Now imports QueueItem from dashboard.types to avoid duplication
 */
export interface QueueSection {
    id: string;
    title: string;
    description?: string;
    color: string; // 'red', 'orange', 'blue', 'gray' for visual styling
    icon?: string;
    items: QueueItem[];
    priority: number; // Section priority for ordering
}

/**
 * Queue filter options
 */
export interface QueueFilter {
    modules: Set<ModuleType>;
    priorities: Set<PriorityLevel>;
    dueDateRange?: {
        start: Date;
        end: Date;
    };
    searchQuery?: string;
}

/**
 * Queue sort options
 */
export type QueueSortBy = 'priority' | 'dueDate' | 'title' | 'module';
export type QueueSortOrder = 'asc' | 'desc';

export interface QueueSort {
    by: QueueSortBy;
    order: QueueSortOrder;
}

/**
 * Queue statistics
 */
export interface QueueStats {
    total: number;
    urgent: number;
    high: number;
    medium: number;
    low: number;
    overdue: number;
    dueToday: number;
}

// Re-export for convenience
export type { QueueItem, PriorityLevel, ModuleType };
