import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    AlertCircle,
    TrendingDown,
    TrendingUp,
    Minus,
    Target,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { WeakAreaInsight } from '../../types/intelligence.types';

interface WeakAreaCardProps {
    weakArea: WeakAreaInsight;
    onPractice?: () => void;
}

/**
 * WeakAreaCard - Display detected weak area with actionable insights
 *
 * Features:
 * - Severity-based color coding
 * - Accuracy visualization (progress bar)
 * - Trend indicators (improving/declining/stable)
 * - Review count and priority
 * - Action button to practice
 */
export function WeakAreaCard({ weakArea, onPractice }: WeakAreaCardProps) {
    const severityColor = getSeverityColor(weakArea.severity);
    const TrendIcon = getTrendIcon(weakArea.trend);

    return (
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        >
        <Card className={cn(
            'hover:shadow-md transition-all',
            'border-l-4',
            severityColor.border
        )}>
        <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
        <AlertCircle className={cn('h-4 w-4', severityColor.text)} />
        <h4 className="font-semibold text-sm truncate">
        {weakArea.topic}
        </h4>
        </div>
        <p className="text-xs text-muted-foreground">
        {weakArea.suggestion}
        </p>
        </div>

        {/* Severity Badge */}
        <Badge
        variant="outline"
        className={cn(
            'text-xs font-semibold',
            severityColor.badge
        )}
        >
        {weakArea.severity.toUpperCase()}
        </Badge>
        </div>
        </CardHeader>

        <CardContent className="space-y-4">
        {/* Accuracy Visualization */}
        <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
        <Target className="h-3 w-3" />
        Accuracy
        </span>
        <div className="flex items-center gap-2">
        {weakArea.trend && (
            <TrendIcon className={cn(
                'h-3 w-3',
                weakArea.trend === 'improving' ? 'text-green-600' :
                weakArea.trend === 'declining' ? 'text-red-600' :
                'text-gray-600'
            )} />
        )}
        <span className={cn(
            'font-bold',
            weakArea.accuracy >= 0.7 ? 'text-green-600' :
            weakArea.accuracy >= 0.5 ? 'text-yellow-600' :
            'text-red-600'
        )}>
        {(weakArea.accuracy * 100).toFixed(0)}%
        </span>
        </div>
        </div>
        <Progress
        value={weakArea.accuracy * 100}
        className="h-2"
        // @ts-ignore - custom indicator color
        indicatorClassName={cn(
            weakArea.accuracy >= 0.7 ? 'bg-green-600' :
            weakArea.accuracy >= 0.5 ? 'bg-yellow-600' :
            'bg-red-600'
        )}
        />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50">
        <span className="text-muted-foreground">Reviews</span>
        <span className="font-semibold text-sm">
        {weakArea.review_count}
        </span>
        </div>
        <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50">
        <span className="text-muted-foreground">Priority</span>
        <span className="font-semibold text-sm">
        {(weakArea.priority * 100).toFixed(0)}%
        </span>
        </div>
        </div>

        {/* Trend Insight */}
        {weakArea.trend && (
            <div className={cn(
                'text-xs p-2 rounded-lg flex items-center gap-2',
                weakArea.trend === 'improving'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : weakArea.trend === 'declining'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
            )}>
            <TrendIcon className="h-3 w-3" />
            <span>
            {weakArea.trend === 'improving' && 'Your performance is improving'}
            {weakArea.trend === 'declining' && 'Performance is declining - needs attention'}
            {weakArea.trend === 'stable' && 'Performance is stable'}
            </span>
            </div>
        )}

        {/* Action Button */}
        <Button
        variant={weakArea.severity === 'critical' ? 'destructive' : 'default'}
        size="sm"
        className="w-full"
        onClick={onPractice || (() => {
            window.location.href = `/flashcards/review?topic=${encodeURIComponent(weakArea.topic)}`;
        })}
        >
        Practice Now
        </Button>
        </CardContent>
        </Card>
        </motion.div>
    );
}

// Get severity color classes
function getSeverityColor(severity: string) {
    switch (severity) {
        case 'critical':
            return {
                border: 'border-l-red-600',
                text: 'text-red-600 dark:text-red-400',
                badge: 'border-red-600 text-red-600',
            };
        case 'high':
            return {
                border: 'border-l-orange-600',
                text: 'text-orange-600 dark:text-orange-400',
                badge: 'border-orange-600 text-orange-600',
            };
        case 'medium':
            return {
                border: 'border-l-yellow-600',
                text: 'text-yellow-600 dark:text-yellow-400',
                badge: 'border-yellow-600 text-yellow-600',
            };
        default:
            return {
                border: 'border-l-gray-400',
                text: 'text-gray-600 dark:text-gray-400',
                badge: 'border-gray-400 text-gray-600',
            };
    }
}

// Get trend icon
function getTrendIcon(trend: string | null | undefined) {
    if (trend === 'improving') return TrendingUp;
    if (trend === 'declining') return TrendingDown;
    return Minus;
}
