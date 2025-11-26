import { PRIORITY_WEIGHTS, PRIORITY_THRESHOLDS } from '../constants/priorityWeights';
import type { PriorityLevel, QueueItem } from '../types/dashboard.types';

/**
 * Calculate priority score for a queue item (0-1)
 */
export function calculatePriority(item: Partial<QueueItem>): number {
    const { dueDate, metadata } = item;

    // 1. Due urgency score (0-1)
    const dueScore = calculateDueScore(dueDate);

    // 2. Weak area score (0-1)
    const weakScore = metadata?.accuracy ? 1 - metadata.accuracy : 0;

    // 3. Dependency score (has prerequisites or unlocks content)
    const depScore = metadata?.hasPrerequisites ? 0.8 : 0;

    // 4. Recency score (recently accessed = lower priority)
    const recencyScore = calculateRecencyScore(metadata?.lastReviewed);

    // Weighted sum
    const totalScore =
    PRIORITY_WEIGHTS.dueUrgency * dueScore +
    PRIORITY_WEIGHTS.weakArea * weakScore +
    PRIORITY_WEIGHTS.dependency * depScore +
    PRIORITY_WEIGHTS.recency * recencyScore;

    return Math.max(0, Math.min(1, totalScore));
}

/**
 * Convert priority score to priority level
 */
export function scoreToPriorityLevel(score: number): PriorityLevel {
    if (score >= PRIORITY_THRESHOLDS.urgent) return 'urgent';
    if (score >= PRIORITY_THRESHOLDS.high) return 'high';
    if (score >= PRIORITY_THRESHOLDS.medium) return 'medium';
    return 'low';
}

/**
 * Calculate due score based on due date
 * - Overdue = 1.0
 * - Due today = 0.9
 * - Due in 1-3 days = 0.7-0.8
 * - Due in 4-7 days = 0.4-0.6
 * - Due > 1 week = 0-0.3
 */
function calculateDueScore(dueDate?: string): number {
    if (!dueDate) return 0;

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return 1.0; // Overdue
    if (diffDays < 1) return 0.9; // Due today
    if (diffDays < 3) return 0.8 - (diffDays - 1) * 0.05; // Due in 1-3 days
    if (diffDays < 7) return 0.6 - (diffDays - 3) * 0.05; // Due in 4-7 days
    return Math.max(0, 0.3 - (diffDays - 7) * 0.01); // Due > 1 week
}

/**
 * Calculate recency score
 * - Never accessed = 1.0
 * - Accessed > 30 days ago = 0.8-1.0
 * - Accessed 7-30 days ago = 0.5-0.8
 * - Accessed < 7 days ago = 0-0.5
 */
function calculateRecencyScore(lastReviewed?: string): number {
    if (!lastReviewed) return 1.0; // Never accessed

    const now = new Date();
    const last = new Date(lastReviewed);
    const diffMs = now.getTime() - last.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > 30) return 1.0;
    if (diffDays > 7) return 0.5 + (diffDays - 7) / 23 * 0.3;
    return Math.min(1, diffDays / 7 * 0.5);
}

/**
 * Sort queue items by priority score
 */
export function sortByPriority(items: QueueItem[]): QueueItem[] {
    return [...items].sort((a, b) => b.priorityScore - a.priorityScore);
}
