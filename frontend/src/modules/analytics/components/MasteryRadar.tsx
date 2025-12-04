import { motion } from 'framer-motion';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopicMastery } from '../hooks/useAnalytics';
import { formatPercentage } from '@/lib/utils';
import type { TopicMastery } from '@/api/generated';

/**
 * Enhanced MasteryRadar Component
 *
 * Improvements per documentation:
 * - Smooth fade-in animation for entire card
 * - Chart entry animation (expand from center)
 * - Enhanced tooltip with better styling
 * - Animated average mastery display
 * - Topic cards below with hover effects
 * - Better responsive layout
 * - Improved empty state
 */

interface MasteryRadarProps {
    className?: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: TopicMastery }>;
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
        Mastery: {formatPercentage(data.mastery_score, 1)}
        </p>
        <p className="text-sm text-muted-foreground">Cards: {data.card_count}</p>
        <p className="text-sm text-muted-foreground">
        Ease Factor: {data.avg_ease_factor.toFixed(2)}
        </p>
        </motion.div>
    );
}

export function MasteryRadar({ className }: MasteryRadarProps) {
    const { data, isLoading, isError } = useTopicMastery();

    if (isLoading) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Topic Mastery</CardTitle>
            <CardDescription>Your proficiency across different topics</CardDescription>
            </CardHeader>
            <CardContent>
            <Skeleton className="h-[300px] w-full animate-shimmer" />
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
            ))}
            </div>
            </CardContent>
            </Card>
        );
    }

    if (isError || !data) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Topic Mastery</CardTitle>
            <CardDescription>Your proficiency across different topics</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Failed to load mastery data
            </div>
            </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Topic Mastery</CardTitle>
            <CardDescription>Your proficiency across different topics</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
            <p>No topics available yet</p>
            <p className="text-sm">Create flashcard decks to see your mastery</p>
            </div>
            </CardContent>
            </Card>
        );
    }

    // Limit to top 8 topics for radar chart readability
    const chartData = data.slice(0, 8).map((topic) => ({
        ...topic,
        // Truncate long topic names
        displayName: topic.topic.length > 12 ? `${topic.topic.slice(0, 12)}...` : topic.topic,
    }));

    // Calculate average mastery
    const avgMastery = data.reduce((sum, t) => sum + t.mastery_score, 0) / data.length;

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        >
        <Card className={className}>
        <CardHeader>
        <div className="flex items-center justify-between">
        <div>
        <CardTitle>Topic Mastery</CardTitle>
        <CardDescription>Your proficiency across different topics</CardDescription>
        </div>
        <motion.div
        className="text-right"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        >
        <p className="text-2xl font-bold text-primary">
        {formatPercentage(avgMastery, 0)}
        </p>
        <p className="text-xs text-muted-foreground">Average</p>
        </motion.div>
        </div>
        </CardHeader>
        <CardContent>
        <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        >
        <ResponsiveContainer width="100%" height={300}>
        <RadarChart
        data={chartData}
        margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
        >
        <PolarGrid className="stroke-muted" />
        <PolarAngleAxis
        dataKey="displayName"
        tick={{ fontSize: 11 }}
        className="text-muted-foreground"
        />
        <PolarRadiusAxis
        domain={[0, 1]}
        tickFormatter={(v) => formatPercentage(v)}
        tick={{ fontSize: 10 }}
        className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Radar
        dataKey="mastery_score"
        stroke="#8b5cf6"
        fill="#8b5cf6"
        fillOpacity={0.5}
        strokeWidth={2}
        isAnimationActive={true}
        animationDuration={1000}
        animationEasing="ease-out"
        />
        </RadarChart>
        </ResponsiveContainer>
        </motion.div>

        {/* Topic list below chart with stagger animation */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {data.slice(0, 8).map((topic, index) => (
            <motion.div
            key={topic.topic}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: 0.4 + index * 0.05,
                duration: 0.3,
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="rounded-lg border p-2 text-center transition-shadow hover:shadow-md"
            >
            <p className="truncate text-xs font-medium" title={topic.topic}>
            {topic.topic}
            </p>
            <p className="text-lg font-bold text-primary">
            {formatPercentage(topic.mastery_score, 0)}
            </p>
            <p className="text-xs text-muted-foreground">
            {topic.card_count} cards
            </p>
            </motion.div>
        ))}
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}

export default MasteryRadar;
