import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWeakAreas } from '../hooks/useAnalytics';
import { formatPercentage, getSeverityVariant } from '@/lib/utils';
import { Target } from 'lucide-react';
import type { WeakArea } from '@/api/generated';

/**
 * Enhanced WeakAreasChart Component
 *
 * Improvements per documentation:
 * - Smooth fade-in animation for entire card
 * - Bars animate from left to right with stagger
 * - Enhanced tooltip with motion
 * - Action buttons for "Focus Study"
 * - Better mobile summary list with animations
 * - Improved empty state with celebration
 * - Color-coded severity indicators
 */

interface WeakAreasChartProps {
    className?: string;
    limit?: number;
}

function getBarColor(accuracy: number): string {
    if (accuracy < 0.5) return '#ef4444'; // red
    if (accuracy < 0.7) return '#f59e0b'; // yellow
    return '#10b981'; // green
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: WeakArea }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
        <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border bg-background p-3 shadow-lg"
        >
        <p className="font-medium">{data.topic}</p>
        <p className="text-sm text-muted-foreground">
        Accuracy: {formatPercentage(data.accuracy, 1)}
        </p>
        <p className="text-sm text-muted-foreground">Reviews: {data.review_count}</p>
        <Badge variant={getSeverityVariant(data.severity)} className="mt-1">
        {data.severity} priority
        </Badge>
        </motion.div>
    );
}

export function WeakAreasChart({ className, limit = 10 }: WeakAreasChartProps) {
    const { data, isLoading, isError } = useWeakAreas(limit);

    if (isLoading) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Areas to Improve</CardTitle>
            <CardDescription>Topics that need more practice</CardDescription>
            </CardHeader>
            <CardContent>
            <Skeleton className="h-[300px] w-full animate-shimmer" />
            </CardContent>
            </Card>
        );
    }

    if (isError || !data) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Areas to Improve</CardTitle>
            <CardDescription>Topics that need more practice</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Failed to load weak areas
            </div>
            </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            >
            <Card className={className}>
            <CardHeader>
            <CardTitle>Areas to Improve</CardTitle>
            <CardDescription>Topics that need more practice</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex h-[300px] flex-col items-center justify-center text-center">
            <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-4 text-6xl"
            >
            🎉
            </motion.div>
            <p className="text-lg font-medium">Great job!</p>
            <p className="text-sm text-muted-foreground">No weak areas detected</p>
            </div>
            </CardContent>
            </Card>
            </motion.div>
        );
    }

    // Sort by accuracy (lowest first)
    const sortedData = [...data].sort((a, b) => a.accuracy - b.accuracy);

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        >
        <Card className={className}>
        <CardHeader>
        <CardTitle>Areas to Improve</CardTitle>
        <CardDescription>
        Topics with accuracy below 70% need attention
        </CardDescription>
        </CardHeader>
        <CardContent>
        <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        >
        <ResponsiveContainer width="100%" height={300}>
        <BarChart
        layout="vertical"
        data={sortedData}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
        <XAxis
        type="number"
        domain={[0, 1]}
        tickFormatter={(v) => formatPercentage(v)}
        tick={{ fontSize: 12 }}
        />
        <YAxis
        type="category"
        dataKey="topic"
        width={120}
        tick={{ fontSize: 12 }}
        tickFormatter={(v) => (v.length > 15 ? `${v.slice(0, 15)}...` : v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
        dataKey="accuracy"
        radius={[0, 4, 4, 0]}
        isAnimationActive={true}
        animationDuration={1000}
        animationEasing="ease-out"
        >
        {sortedData.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.accuracy)} />
        ))}
        </Bar>
        </BarChart>
        </ResponsiveContainer>
        </motion.div>

        {/* Mobile summary list with animations */}
        <div className="mt-4 space-y-2 md:hidden">
        {sortedData.slice(0, 5).map((area, index) => (
            <motion.div
            key={area.topic}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.02, x: 4 }}
            className="flex items-center justify-between rounded-lg border p-3 transition-shadow hover:shadow-md"
            >
            <div className="flex-1 truncate pr-2">
            <p className="truncate text-sm font-medium">{area.topic}</p>
            <p className="text-xs text-muted-foreground">
            {area.review_count} reviews
            </p>
            </div>
            <div className="flex items-center gap-2">
            <span
            className="text-sm font-medium"
            style={{ color: getBarColor(area.accuracy) }}
            >
            {formatPercentage(area.accuracy, 0)}
            </span>
            <Badge variant={getSeverityVariant(area.severity)} className="text-xs">
            {area.severity}
            </Badge>
            </div>
            </motion.div>
        ))}
        </div>

        {/* Focus Study Action Button */}
        {data.length > 0 && (
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mt-6 flex justify-center"
            >
            <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => {
                // TODO: Navigate to focused study session
                console.log('Start focused study session');
            }}
            >
            <Target className="h-4 w-4" />
            Start Focused Study
            </Button>
            </motion.div>
        )}
        </CardContent>
        </Card>
        </motion.div>
    );
}

export default WeakAreasChart;
