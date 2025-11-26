/**
 * StatCard - Versatile statistics display card
 *
 * Features:
 * - Animated counter with prefix/suffix/formatter
 * - Trend indicators (up/down/neutral) with colors
 * - Optional icon and sparkline visualization
 * - Glass morphism styling with hover effects
 * - Flexible layout (compact/expanded modes)
 * - Supports comparison (current vs previous period)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { cn } from '@/lib/utils';
import GlassCard from './GlassCard';

export interface StatCardProps {
    // Main stat data
    label: string;
    value: number;

    // Formatting
    prefix?: string;
    suffix?: string;
    decimals?: number;
    formatter?: (value: number) => string;

    // Trend analysis
    trend?: {
        value: number; // Percentage change (-100 to +∞)
        label?: string; // e.g., "vs last week"
        period?: string; // e.g., "7d", "30d"
    };

    // Visual elements
    icon?: LucideIcon;
    iconColor?: string;
    sparkline?: number[]; // Mini chart data points

    // Layout
    variant?: 'default' | 'compact' | 'expanded';
    className?: string;
    onClick?: () => void;
}

/**
 * Determines trend direction and color
 */
function getTrendInfo(trendValue: number) {
    if (trendValue > 0) {
        return {
            icon: TrendingUp,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            label: 'Positive',
        };
    } else if (trendValue < 0) {
        return {
            icon: TrendingDown,
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
            label: 'Negative',
        };
    } else {
        return {
            icon: Minus,
            color: 'text-gray-400',
            bgColor: 'bg-gray-500/10',
            label: 'Neutral',
        };
    }
}

/**
 * Mini sparkline SVG
 */
function Sparkline({ data, className }: { data: number[]; className?: string }) {
    if (data.length < 2) return null;

    const width = 80;
    const height = 24;
    const padding = 2;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((value - min) / range) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg
        width={width}
        height={height}
        className={cn('opacity-40', className)}
        viewBox={`0 0 ${width} ${height}`}
        >
        <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        />
        </svg>
    );
}

export function StatCard({
    label,
    value,
    prefix = '',
    suffix = '',
    decimals = 0,
    formatter,
        trend,
        icon: Icon,
        iconColor = 'text-[#5685FE]',
        sparkline,
        variant = 'default',
        className,
        onClick,
}: StatCardProps) {
    const trendInfo = trend ? getTrendInfo(trend.value) : null;
    const TrendIcon = trendInfo?.icon;

    const isCompact = variant === 'compact';
    const isExpanded = variant === 'expanded';

    return (
        <GlassCard
        hover={!!onClick}
        onClick={onClick}
        className={cn(
            'p-4 cursor-default',
            onClick && 'cursor-pointer',
            isCompact && 'p-3',
            className
        )}
        whileHover={onClick ? { y: -2 } : undefined}
        >
        <div className="flex items-start justify-between gap-3">
        {/* Left: Label & Value */}
        <div className="flex-1 min-w-0">
        {/* Label */}
        <div className="flex items-center gap-2 mb-1">
        {Icon && (
            <Icon
            className={cn('h-4 w-4 flex-shrink-0', iconColor)}
            strokeWidth={2}
            />
        )}
        <p
        className={cn(
            'text-sm font-medium text-white/60 truncate',
            isCompact && 'text-xs'
        )}
        >
        {label}
        </p>
        </div>

        {/* Value */}
        <div className={cn('flex items-baseline gap-2', isExpanded && 'mb-2')}>
        <AnimatedCounter
        value={value}
        prefix={prefix}
        suffix={suffix}
        decimals={decimals}
        formatter={formatter}
        className={cn(
            'text-2xl font-bold text-white',
            isCompact && 'text-xl',
            isExpanded && 'text-3xl'
        )}
        duration={0.8}
        />

        {/* Trend Badge (inline for compact/default) */}
        {trend && trendInfo && !isExpanded && (
            <div
            className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full',
                trendInfo.bgColor,
                isCompact && 'px-1.5'
            )}
            >
            <TrendIcon
            className={cn('h-3 w-3', trendInfo.color)}
            strokeWidth={2.5}
            />
            <span
            className={cn(
                'text-xs font-semibold tabular-nums',
                trendInfo.color
            )}
            >
            {Math.abs(trend.value).toFixed(1)}%
            </span>
            </div>
        )}
        </div>

        {/* Trend Details (expanded mode) */}
        {trend && trendInfo && isExpanded && (
            <div className="flex items-center gap-2 mt-1">
            <div
            className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                trendInfo.bgColor
            )}
            >
            <TrendIcon
            className={cn('h-3.5 w-3.5', trendInfo.color)}
            strokeWidth={2.5}
            />
            <span
            className={cn(
                'text-sm font-semibold tabular-nums',
                trendInfo.color
            )}
            >
            {trend.value > 0 ? '+' : ''}
            {trend.value.toFixed(1)}%
            </span>
            </div>
            {trend.label && (
                <span className="text-xs text-white/40">{trend.label}</span>
            )}
            </div>
        )}
        </div>

        {/* Right: Sparkline */}
        {sparkline && sparkline.length > 1 && (
            <div className="flex-shrink-0">
            <Sparkline
            data={sparkline}
            className={cn('text-[#5685FE]', iconColor)}
            />
            </div>
        )}
        </div>
        </GlassCard>
    );
}

/**
 * Pre-configured stat cards for common dashboard metrics
 */

interface CommonStatProps {
    value: number;
    trend?: StatCardProps['trend'];
    sparkline?: number[];
    className?: string;
    onClick?: () => void;
}

export function TotalReviewsCard({ value, trend, sparkline, className, onClick }: CommonStatProps) {
    return (
        <StatCard
        label="Total Reviews"
        value={value}
        formatter={(v) => v.toLocaleString()}
        trend={trend}
        sparkline={sparkline}
        icon={TrendingUp}
        iconColor="text-blue-400"
        className={className}
        onClick={onClick}
        />
    );
}

export function AccuracyCard({ value, trend, sparkline, className, onClick }: CommonStatProps) {
    return (
        <StatCard
        label="Accuracy"
        value={value}
        suffix="%"
        decimals={1}
        trend={trend}
        sparkline={sparkline}
        icon={TrendingUp}
        iconColor="text-green-400"
        className={className}
        onClick={onClick}
        />
    );
}

export function StudyTimeCard({ value, trend, sparkline, className, onClick }: CommonStatProps) {
    // Convert minutes to hours
    const hours = value / 60;

    return (
        <StatCard
        label="Study Time"
        value={hours}
        suffix="h"
        decimals={1}
        trend={trend}
        sparkline={sparkline}
        icon={TrendingUp}
        iconColor="text-purple-400"
        className={className}
        onClick={onClick}
        />
    );
}

export function StreakCard({ value, trend, className, onClick }: CommonStatProps) {
    return (
        <StatCard
        label="Current Streak"
        value={value}
        suffix=" days"
        trend={trend}
        icon={TrendingUp}
        iconColor="text-orange-400"
        className={className}
        onClick={onClick}
        variant="compact"
        />
    );
}

export default StatCard;
