import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePerformanceTrends } from '../hooks/useAnalytics';
import { formatPercentage } from '@/lib/utils';

/**
 * Enhanced PerformanceTrends Component
 *
 * Improvements per documentation:
 * - Smooth fade-in animation for entire card
 * - Chart lines animate from left to right
 * - Animated time range button transitions
 * - Enhanced tooltip with better styling
 * - Better loading states with shimmer
 * - Improved responsive design
 * - Hover effects on buttons
 */

interface PerformanceTrendsProps {
    className?: string;
}

type TimeRange = 7 | 30 | 90;

const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: 7, label: '7 days' },
{ value: 30, label: '30 days' },
{ value: 90, label: '90 days' },
];

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    return (
        <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border bg-background p-3 shadow-lg"
        >
        <p className="mb-2 font-medium">
        {label
            ? new Date(label).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            })
            : ''}
            </p>
            {payload.map((entry, i) => (
                <p key={i} className="text-sm" style={{ color: entry.color }}>
                {entry.name}:{' '}
                {entry.name === 'Accuracy' ? formatPercentage(entry.value) : entry.value}
                </p>
            ))}
            </motion.div>
    );
}

export function PerformanceTrends({ className }: PerformanceTrendsProps) {
    const [days, setDays] = useState<TimeRange>(30);
    const { data, isLoading, isError } = usePerformanceTrends(days);

    if (isLoading) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="mb-4 flex justify-end gap-1">
            {TIME_RANGES.map((range) => (
                <Skeleton key={range.value} className="h-9 w-20" />
            ))}
            </div>
            <Skeleton className="h-[300px] w-full animate-shimmer" />
            </CardContent>
            </Card>
        );
    }

    if (isError || !data) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Failed to load performance data
            </div>
            </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No data available for this period
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
        <CardTitle>Performance Trends</CardTitle>
        <div className="flex gap-1">
        {TIME_RANGES.map((range) => (
            <motion.div
            key={range.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            >
            <Button
            variant={days === range.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(range.value)}
            >
            {range.label}
            </Button>
            </motion.div>
        ))}
        </div>
        </CardHeader>
        <CardContent>
        <motion.div
        key={days} // Re-animate when days change
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        >
        <ResponsiveContainer width="100%" height={300}>
        <LineChart
        data={data}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
        dataKey="date"
        tickFormatter={formatDate}
        tick={{ fontSize: 12 }}
        className="text-muted-foreground"
        />
        <YAxis
        yAxisId="left"
        tick={{ fontSize: 12 }}
        className="text-muted-foreground"
        />
        <YAxis
        yAxisId="right"
        orientation="right"
        domain={[0, 1]}
        tickFormatter={(v) => formatPercentage(v)}
        tick={{ fontSize: 12 }}
        className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
        yAxisId="left"
        type="monotone"
        dataKey="reviews_count"
        stroke="#8b5cf6"
        strokeWidth={2}
        dot={false}
        name="Reviews"
        isAnimationActive={true}
        animationDuration={1000}
        animationEasing="ease-out"
        />
        <Line
        yAxisId="right"
        type="monotone"
        dataKey="accuracy"
        stroke="#10b981"
        strokeWidth={2}
        dot={false}
        name="Accuracy"
        isAnimationActive={true}
        animationDuration={1000}
        animationEasing="ease-out"
        />
        </LineChart>
        </ResponsiveContainer>
        </motion.div>
        </CardContent>
        </Card>
        </motion.div>
    );
}

export default PerformanceTrends;
