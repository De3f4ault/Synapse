/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const absDiffMs = Math.abs(diffMs);
    const isPast = diffMs < 0;

    const seconds = Math.floor(absDiffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    let str = '';

    if (years > 0) str = `${years} year${years > 1 ? 's' : ''}`;
    else if (months > 0) str = `${months} month${months > 1 ? 's' : ''}`;
    else if (weeks > 0) str = `${weeks} week${weeks > 1 ? 's' : ''}`;
    else if (days > 0) str = `${days} day${days > 1 ? 's' : ''}`;
    else if (hours > 0) str = `${hours} hour${hours > 1 ? 's' : ''}`;
    else if (minutes > 0) str = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    else str = 'just now';

    if (str === 'just now') return str;
    return isPast ? `${str} ago` : `in ${str}`;
}

/**
 * Format due date with urgency context
 */
export function formatDueDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const overdueDays = Math.abs(diffDays);
        return `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`;
    }
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;

    const weeks = Math.floor(diffDays / 7);
    if (weeks < 4) return `Due in ${weeks} week${weeks > 1 ? 's' : ''}`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format streak display
 */
export function formatStreak(days: number): string {
    if (days === 0) return 'No streak';
    if (days === 1) return '1-day streak';
    return `${days}-day streak`;
}

/**
 * Format date for activity heatmap (YYYY-MM-DD)
 */
export function formatHeatmapDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Get days ago from date
 */
export function daysSince(date: string | Date): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format time range for session
 */
export function formatTimeRange(start: Date, end: Date): string {
    const startTime = start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    const endTime = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    return `${startTime} - ${endTime}`;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        const remainingMins = minutes % 60;
        return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    if (minutes > 0) {
        const remainingSecs = seconds % 60;
        return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s` : `${minutes}m`;
    }
    return `${seconds}s`;
}
