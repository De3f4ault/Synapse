import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePerformanceTrends } from '@/api/hooks/useAnalytics';
import { LoadingState } from '../shared/LoadingState';

/**
 * ActivitySparkline - Mini trend charts for quick metrics
 *
 * Features:
 * - Small line/area charts (SVG-based)
 * - Multiple sparklines (reviews, accuracy, study time)
 * - Hover to show exact values
 * - Trend direction indicators (↑↓)
 * - Responsive sizing
 *
 * Data: Last 30 days of performance trends
 */
export function ActivitySparkline() {
    const { data: trendsData, isLoading, error } = usePerformanceTrends(30);

    if (isLoading) {
        return (
            <Card>
            <CardContent className="p-6">
            <LoadingState />
            </CardContent>
            </Card>
        );
    }

    if (error || !trendsData || trendsData.length === 0) {
        return (
            <Card>
            <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
            <p className="text-sm text-muted-foreground">No trend data available</p>
            </CardContent>
            </Card>
        );
    }

    // Calculate trends
    const reviewsTrend = calculateTrend(trendsData.map((d) => d.reviews_count));
    const accuracyTrend = calculateTrend(trendsData.map((d) => d.accuracy * 100));
    const studyTimeTrend = calculateTrend(trendsData.map((d) => d.study_time_minutes));

    // Latest values
    const latest = trendsData[trendsData.length - 1];

    return (
        <Card>
        <CardHeader>
        <CardTitle>Performance Trends</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Reviews Sparkline */}
        <SparklineRow
        label="Reviews"
        value={latest.reviews_count}
        suffix="today"
        trend={reviewsTrend}
        data={trendsData.map((d) => d.reviews_count)}
        color="hsl(var(--primary))"
        />

        {/* Accuracy Sparkline */}
        <SparklineRow
        label="Accuracy"
        value={Math.round(latest.accuracy * 100)}
        suffix="%"
        trend={accuracyTrend}
        data={trendsData.map((d) => d.accuracy * 100)}
        color="hsl(142, 76%, 36%)" // Green
        />

        {/* Study Time Sparkline */}
        <SparklineRow
        label="Study Time"
        value={latest.study_time_minutes}
        suffix="min"
        trend={studyTimeTrend}
        data={trendsData.map((d) => d.study_time_minutes)}
        color="hsl(217, 91%, 60%)" // Blue
        />
        </CardContent>
        </Card>
    );
}

/**
 * Individual sparkline row
 */
interface SparklineRowProps {
    label: string;
    value: number;
    suffix: string;
    trend: 'up' | 'down' | 'stable';
    data: number[];
    color: string;
}

function SparklineRow({ label, value, suffix, trend, data, color }: SparklineRowProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor =
    trend === 'up'
    ? 'text-green-500'
    : trend === 'down'
    ? 'text-red-500'
    : 'text-muted-foreground';

    return (
        <div className="flex items-center justify-between gap-4">
        {/* Label and Value */}
        <div className="flex-1">
        <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <TrendIcon className={`h-3 w-3 ${trendColor}`} />
        </div>
        <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{suffix}</span>
        </div>
        </div>

        {/* Sparkline Chart */}
        <div className="flex-1">
        <SparklineChart data={data} color={color} />
        </div>
        </div>
    );
}

/**
 * Mini sparkline chart (SVG-based)
 */
interface SparklineChartProps {
    data: number[];
    color: string;
    height?: number;
    width?: number;
}

function SparklineChart({ data, color, height = 40, width = 150 }: SparklineChartProps) {
    if (data.length < 2) {
        return <div style={{ height, width }} className="bg-muted/20 rounded" />;
    }

    // Normalize data to fit chart dimensions
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    // Create area path (filled sparkline)
    const areaPath = `M 0,${height} L ${points} L ${width},${height} Z`;

    return (
        <motion.svg
        width={width}
        height={height}
        className="overflow-visible"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        >
        {/* Area fill */}
        <motion.path
        d={areaPath}
        fill={color}
        fillOpacity={0.2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        />

        {/* Line */}
        <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        />

        {/* End point dot */}
        <motion.circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r={3}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        />
        </motion.svg>
    );
}

/**
 * Calculate trend direction from data points
 * Compares average of first half vs second half
 */
function calculateTrend(data: number[]): 'up' | 'down' | 'stable' {
    if (data.length < 4) return 'stable';

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const threshold = 0.05; // 5% change threshold

    if (secondAvg > firstAvg * (1 + threshold)) return 'up';
    if (secondAvg < firstAvg * (1 - threshold)) return 'down';
    return 'stable';
}
