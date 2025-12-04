import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * MiniChart Component
 *
 * Small sparkline charts for displaying trends in compact spaces.
 * Used in dashboard cards and summary sections.
 *
 * Features:
 * - Line and Area chart variants
 * - Smooth animations on mount
 * - Color variants (success, warning, danger, primary)
 * - Responsive to container size
 * - Optional gradient fills
 */

interface MiniChartProps {
    data: Array<{ value: number }>;
    variant?: 'line' | 'area';
    color?: 'success' | 'warning' | 'danger' | 'primary' | 'purple' | 'blue';
    height?: number;
    className?: string;
    animate?: boolean;
}

const COLOR_MAP = {
    success: '#10b981', // green-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444', // red-500
    primary: '#3b82f6', // blue-500
    purple: '#8b5cf6', // purple-500
    blue: '#3b82f6', // blue-500
};

export function MiniChart({
    data,
    variant = 'line',
    color = 'primary',
    height = 40,
    className,
    animate = true,
}: MiniChartProps) {
    const strokeColor = COLOR_MAP[color];

    // Normalize data to ensure we have valid numbers
    const chartData = useMemo(() => {
        return data.map((item) => ({
            value: typeof item.value === 'number' ? item.value : 0,
        }));
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div
            className={cn('flex items-center justify-center', className)}
            style={{ height }}
            >
            <div className="h-full w-full bg-muted/20 rounded" />
            </div>
        );
    }

    const chartElement = variant === 'area' ? (
        <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
        </defs>
        <Area
        type="monotone"
        dataKey="value"
        stroke={strokeColor}
        strokeWidth={2}
        fill={`url(#gradient-${color})`}
        isAnimationActive={animate}
        animationDuration={1000}
        animationEasing="ease-out"
        />
        </AreaChart>
        </ResponsiveContainer>
    ) : (
        <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line
        type="monotone"
        dataKey="value"
        stroke={strokeColor}
        strokeWidth={2}
        dot={false}
        isAnimationActive={animate}
        animationDuration={1000}
        animationEasing="ease-out"
        />
        </LineChart>
        </ResponsiveContainer>
    );

    if (!animate) {
        return <div className={className}>{chartElement}</div>;
    }

    return (
        <motion.div
        className={className}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        >
        {chartElement}
        </motion.div>
    );
}

export default MiniChart;
