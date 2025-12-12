import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useActivityHeatmap, usePerformanceTrends } from '@/api/hooks/useAnalytics';
import type { HeatmapData, PerformanceTrend } from '@/api/generated/types.gen';

/**
 * Activity statistics aggregated from heatmap data
 */
export interface ActivityStats {
    totalActivities: number;
    currentStreak: number;
    longestStreak: number;
    averageDaily: number;
    peakDay: { date: string; count: number } | null;
    weeklyAverage: number;
}

/**
 * Hook to fetch and process activity data for heatmap and sparklines
 *
 * Features:
 * - Fetches 365 days of activity data from backend
 * - Calculates streak information (current & longest)
 * - Aggregates by week/month for sparklines
 * - Finds peak activity times
 * - Caches for 30 minutes to reduce API calls
 *
 * @param days - Number of days to fetch (default: 365)
 * @returns Activity heatmap data, stats, and loading state
 */
export function useActivityData(days: number = 365) {
    // Fetch heatmap data from backend
    const {
        data: heatmapData,
        isLoading: isHeatmapLoading,
        error: heatmapError,
    } = useActivityHeatmap(days);

    // Fetch performance trends (last 30 days for sparklines)
    const {
        data: trendsData,
        isLoading: isTrendsLoading,
        error: trendsError,
    } = usePerformanceTrends(30);

    // Compute activity statistics
    const stats = useQuery<ActivityStats>({
        queryKey: [...queryKeys.analytics.heatmap(days), 'stats'],
                                          queryFn: () => calculateActivityStats(heatmapData || []),
                                          enabled: !!heatmapData,
                                          staleTime: 1000 * 60 * 30, // 30 minutes
    });

    return {
        // Raw data
        heatmapData: heatmapData || [],
        trendsData: trendsData || [],

        // Computed statistics
        stats: stats.data,

        // Loading states
        isLoading: isHeatmapLoading || isTrendsLoading || stats.isLoading,

        // Errors
        error: heatmapError || trendsError || stats.error,
    };
}

/**
 * Calculate comprehensive activity statistics from heatmap data
 */
function calculateActivityStats(data: HeatmapData[]): ActivityStats {
    if (!data || data.length === 0) {
        return {
            totalActivities: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageDaily: 0,
            peakDay: null,
            weeklyAverage: 0,
        };
    }

    // Sort by date (oldest first)
    const sorted = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Total activities
    const totalActivities = sorted.reduce((sum, day) => sum + day.activity_count, 0);

    // Average daily activity
    const averageDaily = totalActivities / sorted.length;

    // Weekly average (last 7 days)
    const lastWeek = sorted.slice(-7);
    const weeklyTotal = lastWeek.reduce((sum, day) => sum + day.activity_count, 0);
    const weeklyAverage = weeklyTotal / lastWeek.length;

    // Find peak day
    const peakDay = sorted.reduce(
        (peak, day) => {
            if (day.activity_count > (peak?.count || 0)) {
                return { date: day.date, count: day.activity_count };
            }
            return peak;
        },
        null as { date: string; count: number } | null
    );

    // Calculate current streak (from today backwards)
    const currentStreak = calculateCurrentStreak(sorted);

    // Calculate longest streak
    const longestStreak = calculateLongestStreak(sorted);

    return {
        totalActivities,
        currentStreak,
        longestStreak,
        averageDaily: Math.round(averageDaily * 10) / 10,
        peakDay,
        weeklyAverage: Math.round(weeklyAverage * 10) / 10,
    };
}

/**
 * Calculate current streak (consecutive days with activity from today backwards)
 */
function calculateCurrentStreak(sortedData: HeatmapData[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    for (let i = sortedData.length - 1; i >= 0; i--) {
        const dayData = sortedData[i];
        const dayDate = new Date(dayData.date);
        dayDate.setHours(0, 0, 0, 0);

        // If this day matches our check date
        if (dayDate.getTime() === checkDate.getTime()) {
            if (dayData.activity_count > 0) {
                streak++;
                // Move check date back one day
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break; // Streak broken
            }
        }
    }

    return streak;
}

/**
 * Calculate longest streak in the dataset
 */
function calculateLongestStreak(sortedData: HeatmapData[]): number {
    let longestStreak = 0;
    let currentStreak = 0;

    for (const day of sortedData) {
        if (day.activity_count > 0) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }

    return longestStreak;
}

/**
 * Aggregate heatmap data by week for sparklines
 * Returns last 12 weeks of data
 */
export function aggregateByWeek(data: HeatmapData[]): Array<{ week: string; total: number }> {
    if (!data || data.length === 0) return [];

    // Sort by date
    const sorted = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by week
    const weekMap = new Map<string, number>();

    sorted.forEach((day) => {
        const date = new Date(day.date);
        const weekStart = getWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];

        weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + day.activity_count);
    });

    // Convert to array and take last 12 weeks
    const weeks = Array.from(weekMap.entries())
    .map(([week, total]) => ({ week, total }))
    .slice(-12);

    return weeks;
}

/**
 * Aggregate heatmap data by month for sparklines
 * Returns last 6 months of data
 */
export function aggregateByMonth(data: HeatmapData[]): Array<{ month: string; total: number }> {
    if (!data || data.length === 0) return [];

    // Sort by date
    const sorted = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by month
    const monthMap = new Map<string, number>();

    sorted.forEach((day) => {
        const date = new Date(day.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + day.activity_count);
    });

    // Convert to array and take last 6 months
    const months = Array.from(monthMap.entries())
    .map(([month, total]) => ({ month, total }))
    .slice(-6);

    return months;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
