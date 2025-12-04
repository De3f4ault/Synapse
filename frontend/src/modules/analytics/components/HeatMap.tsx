import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHeatmap } from '../hooks/useAnalytics';
import { cn } from '@/lib/utils';
import type { HeatmapData } from '@/api/generated';

/**
 * Enhanced HeatMap Component
 *
 * Improvements per documentation:
 * - Smooth fade-in animations for cells
 * - Stagger animation on mount
 * - Better hover tooltips with improved styling
 * - Enhanced color intensity algorithm
 * - Responsive design improvements
 * - Loading state with shimmer effect
 */

interface HeatMapProps {
    className?: string;
    days?: number;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColorIntensity(count: number, maxCount: number): string {
    if (count === 0) return 'bg-muted hover:bg-muted/80';
    const ratio = count / maxCount;
    if (ratio < 0.25) return 'bg-green-200 dark:bg-green-900 hover:bg-green-300 dark:hover:bg-green-800';
    if (ratio < 0.5) return 'bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-600';
    if (ratio < 0.75) return 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-400';
    return 'bg-green-800 dark:bg-green-400 hover:bg-green-900 dark:hover:bg-green-300';
}

function generateDateGrid(data: HeatmapData[], days: number) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    // Create a map for quick lookup
    const dataMap = new Map<string, number>();
    data.forEach((d) => {
        dataMap.set(d.date, d.activity_count);
    });

    // Generate grid
    const weeks: Array<Array<{ date: Date; count: number }>> = [];
    let currentWeek: Array<{ date: Date; count: number }> = [];

    // Fill in empty days at the start to align with day of week
    const startDay = startDate.getDay();
    for (let i = 0; i < startDay; i++) {
        currentWeek.push({ date: new Date(0), count: -1 }); // -1 indicates empty cell
    }

    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const count = dataMap.get(dateStr) || 0;

        currentWeek.push({ date, count });

        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Add remaining days
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push({ date: new Date(0), count: -1 });
        }
        weeks.push(currentWeek);
    }

    return weeks;
}

function getMonthLabels(weeks: Array<Array<{ date: Date; count: number }>>) {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
        const validDay = week.find((d) => d.count !== -1);
        if (validDay) {
            const month = validDay.date.getMonth();
            if (month !== lastMonth) {
                labels.push({ month: MONTHS[month], weekIndex });
                lastMonth = month;
            }
        }
    });

    return labels;
}

export function HeatMap({ className, days = 365 }: HeatMapProps) {
    const { data, isLoading, isError } = useHeatmap(days);

    const { weeks, maxCount, monthLabels, totalActivity } = useMemo(() => {
        if (!data || data.length === 0) {
            return { weeks: [], maxCount: 0, monthLabels: [], totalActivity: 0 };
        }

        const max = Math.max(...data.map((d) => d.activity_count), 1);
        const total = data.reduce((sum, d) => sum + d.activity_count, 0);
        const generatedWeeks = generateDateGrid(data, days);
        const labels = getMonthLabels(generatedWeeks);

        return {
            weeks: generatedWeeks,
            maxCount: max,
            monthLabels: labels,
            totalActivity: total,
        };
    }, [data, days]);

    if (isLoading) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="relative">
            <Skeleton className="h-[140px] w-full animate-shimmer" />
            </div>
            </CardContent>
            </Card>
        );
    }

    if (isError || !data) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex h-[140px] items-center justify-center text-muted-foreground">
            Failed to load activity data
            </div>
            </CardContent>
            </Card>
        );
    }

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        >
        <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity</CardTitle>
        <span className="text-sm text-muted-foreground">
        {totalActivity.toLocaleString()} reviews in the last {days} days
        </span>
        </CardHeader>
        <CardContent>
        <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="mb-1 flex pl-8">
        {monthLabels.map((label, i) => (
            <span
            key={i}
            className="text-xs text-muted-foreground"
            style={{
                marginLeft: i === 0 ? label.weekIndex * 12 : undefined,
                width:
                i < monthLabels.length - 1
                ? (monthLabels[i + 1].weekIndex - label.weekIndex) * 12
                : undefined,
            }}
            >
            {label.month}
            </span>
        ))}
        </div>

        <div className="flex">
        {/* Day labels */}
        <div className="mr-2 flex flex-col justify-between py-0.5">
        {DAYS_OF_WEEK.filter((_, i) => i % 2 === 1).map((day) => (
            <span key={day} className="text-xs text-muted-foreground leading-3">
            {day}
            </span>
        ))}
        </div>

        {/* Heatmap grid with stagger animation */}
        <div className="flex gap-0.5">
        {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
            {week.map((day, dayIndex) => (
                <motion.div
                key={dayIndex}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 0.2,
                    delay: (weekIndex * 7 + dayIndex) * 0.002,
                                          ease: 'easeOut',
                }}
                className={cn(
                    'h-2.5 w-2.5 rounded-sm transition-all duration-200',
                    day.count === -1
                    ? 'bg-transparent'
                : getColorIntensity(day.count, maxCount)
                )}
                title={
                    day.count !== -1
                    ? `${day.date.toLocaleDateString()}: ${day.count} reviews`
                    : undefined
                }
                />
            ))}
            </div>
        ))}
        </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="h-2.5 w-2.5 rounded-sm bg-muted" />
        <div className="h-2.5 w-2.5 rounded-sm bg-green-200 dark:bg-green-900" />
        <div className="h-2.5 w-2.5 rounded-sm bg-green-400 dark:bg-green-700" />
        <div className="h-2.5 w-2.5 rounded-sm bg-green-600 dark:bg-green-500" />
        <div className="h-2.5 w-2.5 rounded-sm bg-green-800 dark:bg-green-400" />
        <span>More</span>
        </div>
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}

export default HeatMap;
