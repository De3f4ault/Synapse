import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LucideIcon, Lightbulb, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelligenceInsight } from '../../types/intelligence.types';

interface ContextCardProps {
    insight: IntelligenceInsight;
    onActionClick?: () => void;
}

/**
 * ContextCard - Display single AI-generated context insight
 *
 * Features:
 * - Type-specific icons and colors
 * - Confidence indicator (progress bar)
 * - Optional action button
 * - Hover animations
 */
export function ContextCard({ insight, onActionClick }: ContextCardProps) {
    const IconComponent = getInsightIcon(insight.type);
    const colorClass = getInsightColor(insight.type);

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        >
        <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
        <motion.div
        className={cn(
            'p-2 rounded-lg',
            colorClass.bg
        )}
        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.5 }}
        >
        <IconComponent className={cn('h-5 w-5', colorClass.text)} />
        </motion.div>

        <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm mb-1 truncate">
        {insight.title}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
        {insight.message}
        </p>
        </div>
        </div>

        {/* Insight emoji/icon */}
        {insight.icon && (
            <span className="text-2xl" role="img" aria-label="insight">
            {insight.icon}
            </span>
        )}
        </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
        {/* Confidence Indicator */}
        <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-medium">
        {(insight.confidence * 100).toFixed(0)}%
        </span>
        </div>
        <Progress
        value={insight.confidence * 100}
        className="h-1.5"
        />
        </div>

        {/* Action Button */}
        {insight.actionable && insight.action && (
            <Button
            variant="outline"
            size="sm"
            className="w-full group"
            onClick={onActionClick || (() => {
                if (insight.action?.url) {
                    window.location.href = insight.action.url;
                }
            })}
            >
            {insight.action.label}
            <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Button>
        )}

        {/* Type Badge (bottom right) */}
        <div className="flex justify-end">
        <Badge variant="outline" className="text-xs">
        {insight.type}
        </Badge>
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}

// Get icon based on insight type
function getInsightIcon(type: string): LucideIcon {
    switch (type) {
        case 'urgency':
            return AlertTriangle;
        case 'pattern':
            return TrendingUp;
        case 'suggestion':
            return Lightbulb;
        default:
            return Lightbulb;
    }
}

// Get color classes based on insight type
function getInsightColor(type: string): { bg: string; text: string } {
    switch (type) {
        case 'urgency':
            return {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-600 dark:text-red-400',
            };
        case 'pattern':
            return {
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                text: 'text-blue-600 dark:text-blue-400',
            };
        case 'suggestion':
            return {
                bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                text: 'text-yellow-600 dark:text-yellow-400',
            };
        default:
            return {
                bg: 'bg-gray-100 dark:bg-gray-800',
                text: 'text-gray-600 dark:text-gray-400',
            };
    }
}
