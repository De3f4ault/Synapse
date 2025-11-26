import type { QueueItem, PriorityLevel } from './dashboard.types';

/**
 * Queue section grouping
 */
export interface QueueSection {
    id: string;
    title: string;
    description?: string;
    color: string;
    icon?: string;
    items: QueueItem[];
    collapsed: boolean;
}

/**
 * Queue filter options
 */
export interface QueueFilter {
    modules: Set<string>;
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
