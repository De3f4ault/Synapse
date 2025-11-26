import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp } from 'lucide-react';
import { useActivityData } from '../../hooks/useActivityData';
import { LoadingState } from '../shared/LoadingState';
import { formatDate } from '@/lib/utils';

/**
 * ActivityHeatmap - GitHub-style contribution heatmap
 *
 * Features:
 * - 365-day grid (52 weeks x 7 days)
 * - Color intensity by activity level (0-4 scale)
 * - Hover tooltips with date and activity count
 * - Streak calculation and display
 * - Click to filter dashboard by date (future enhancement)
 *
 * Color Scale:
 * - Level 0: No activity (bg-muted)
 * - Level 1: 1-2 activities (bg-green-500/20)
 * - Level 2: 3-5 activities (bg-green-500/40)
 * - Level 3: 6-10 activities (bg-green-500/60)
 * - Level 4: 11+ activities (bg-green-500)
 */
export function ActivityHeatmap() {
    const { heatmapData, stats, isLoading, error } = useActivityData(365);

    if (isLoading) {
        return (
            <Card className="h-full">
            <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
            <LoadingState />
            </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="h-full">
            <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
            <p className="text-sm text-muted-foreground">Failed to load activity data</p>
            </CardContent>
            </Card>
        );
    }

    // Generate 365 days of data (fill missing days with 0)
    const fullYearData = generateFullYearData(heatmapData);

    // Group by weeks (7 days per week)
    const weeks = chunkArray(fullYearData, 7);

    return (
        <Card className="h-full">
        <CardHeader>
        <div className="flex items-center justify-between">
        <div>
        <CardTitle>Activity Overview</CardTitle>
        <CardDescription>Last 365 days</CardDescription>
        </div>
        {stats && (
            <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <div className="text-right">
            <p className="text-2xl font-bold">{stats.currentStreak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
            </div>
            </div>
            <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div className="text-right">
            <p className="text-2xl font-bold">{Math.round(stats.weeklyAverage)}</p>
            <p className="text-xs text-muted-foreground">weekly avg</p>
            </div>
            </div>
            </div>
        )}
        </div>
        </CardHeader>

        <CardContent>
        <div className="space-y-6">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-1">
        {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
                <HeatmapCell
                key={`${weekIndex}-${dayIndex}`}
                date={day.date}
                count={day.activity_count}
                level={getActivityLevel(day.activity_count)}
                />
            ))}
            </div>
        ))}
        </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((level) => (
            <div
            key={level}
            className={`h-3 w-3 rounded-sm ${getLevelColor(level)}`}
            />
        ))}
        </div>
        <span>More</span>
        </div>

        {stats && stats.longestStreak > 0 && (
            <Badge variant="secondary">
            Longest streak: {stats.longestStreak} days
            </Badge>
        )}
        </div>

        {/* Stats Summary */}
        {stats && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
            <p className="text-2xl font-bold">{stats.totalActivities}</p>
            <p className="text-xs text-muted-foreground">Total activities</p>
            </div>
            <div>
            <p className="text-2xl font-bold">{Math.round(stats.averageDaily)}</p>
            <p className="text-xs text-muted-foreground">Daily average</p>
            </div>
            <div>
            <p className="text-2xl font-bold">
            {stats.peakDay ? stats.peakDay.count : 0}
            </p>
            <p className="text-xs text-muted-foreground">Most in a day</p>
            </div>
            </div>
        )}
        </div>
        </CardContent>
        </Card>
    );
}

/**
 * Individual heatmap cell with tooltip
 */
interface HeatmapCellProps {
    date: string;
    count: number;
    level: number;
}

function HeatmapCell({ date, count, level }: HeatmapCellProps) {
    const formattedDate = formatDate(new Date(date), {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    return (
        <TooltipProvider delayDuration={100}>
        <Tooltip>
        <TooltipTrigger asChild>
        <motion.div
        whileHover={{ scale: 1.2 }}
        transition={{ duration: 0.1 }}
        className={`h-3 w-3 rounded-sm cursor-pointer ${getLevelColor(level)}`}
        />
        </TooltipTrigger>
        <TooltipContent>
        <div className="text-xs">
        <p className="font-medium">{formattedDate}</p>
        <p className="text-muted-foreground">
        {count} {count === 1 ? 'activity' : 'activities'}
        </p>
        </div>
        </TooltipContent>
        </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Get activity level (0-4) based on count
 */
function getActivityLevel(count: number): number {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
}

/**
 * Get Tailwind class for activity level
 */
function getLevelColor(level: number): string {
    switch (level) {
        case 0:
            return 'bg-muted dark:bg-muted/30';
        case 1:
            return 'bg-green-500/20 dark:bg-green-500/30';
        case 2:
            return 'bg-green-500/40 dark:bg-green-500/50';
        case 3:
            return 'bg-green-500/60 dark:bg-green-500/70';
        case 4:
            return 'bg-green-500 dark:bg-green-500';
        default:
            return 'bg-muted';
    }
}

/**
 * Generate full year of data (fill missing days with 0)
 */
function generateFullYearData(data: Array<{ date: string; activity_count: number }>) {
    const dataMap = new Map(data.map((d) => [d.date, d.activity_count]));
    const fullYear: Array<{ date: string; activity_count: number }> = [];

    const today = new Date();
    for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        fullYear.push({
            date: dateStr,
            activity_count: dataMap.get(dateStr) || 0,
        });
    }

    return fullYear;
}

/**
 * Chunk array into subarrays of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
