/**
 * Priority Engine - Calculate urgency and priority for study items
 *
 * Determines which items need attention most urgently based on:
 * - Due dates (overdue items)
 * - Mastery levels (weak areas)
 * - Review patterns (not reviewed recently)
 */

import type { StudyItem, StudyPriority } from '../types/study.types';

/**
 * Calculate urgency score (0-100)
 * Higher score = more urgent
 */
export function calculateUrgencyScore(item: StudyItem): number {
    let score = 0;

    // Due date factor (0-50 points)
    if (item.dueDate) {
        const daysUntil = getDaysUntilDue(item.dueDate);

        if (daysUntil < 0) {
            // Overdue: 50 + up to 50 more based on how overdue
            score += 50 + Math.min(Math.abs(daysUntil) * 2, 50);
        } else if (daysUntil === 0) {
            score += 45; // Due today
        } else if (daysUntil <= 3) {
            score += 25; // Due soon
        } else {
            score += 5;
        }
    }

    // Mastery factor (0-30 points)
    // Lower mastery = higher urgency
    if (typeof item.masteryLevel === 'number') {
        score += Math.max(0, 30 - (item.masteryLevel / 100 * 30));
    }

    // Difficulty factor (0-20 points)
    // Harder items need more attention
    if (item.difficulty) {
        score += (item.difficulty / 5) * 20;
    }

    return Math.min(100, Math.round(score));
}

/**
 * Get priority level from urgency score
 */
export function getPriorityLevel(urgencyScore: number): StudyPriority {
    if (urgencyScore >= 70) return 'high';
    if (urgencyScore >= 40) return 'normal';
    return 'low';
}

/**
 * Sort items by priority (high to low)
 */
export function sortByPriority(items: StudyItem[]): StudyItem[] {
    return [...items].sort((a, b) => {
        const scoreA = calculateUrgencyScore(a);
        const scoreB = calculateUrgencyScore(b);
        return scoreB - scoreA;
    });
}

/**
 * Get days until item is due
 * Negative = overdue
 */
export function getOverdueDays(item: StudyItem): number {
    if (!item.dueDate) return 0;
    return -getDaysUntilDue(item.dueDate);
}

/**
 * Filter items by minimum priority threshold
 */
export function filterByPriorityThreshold(
    items: StudyItem[],
    minUrgency: number = 30
): StudyItem[] {
    return items.filter(item => calculateUrgencyScore(item) >= minUrgency);
}

/**
 * Get color for priority level
 */
export function getPriorityColor(priority: StudyPriority): string {
    const colors: Record<StudyPriority, string> = {
        high: 'text-red-500',
        new: 'text-purple-500',
        normal: 'text-blue-500',
        low: 'text-gray-500',
    };
    return colors[priority] || colors.normal;
}

/**
 * Get badge variant for priority
 */
export function getPriorityBadgeVariant(priority: StudyPriority): 'default' | 'secondary' | 'destructive' | 'outline' {
    const variants: Record<StudyPriority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        high: 'destructive',
        new: 'default',
        normal: 'secondary',
        low: 'outline',
    };
    return variants[priority] || 'secondary';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get days until date (negative if past)
 */
function getDaysUntilDue(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
