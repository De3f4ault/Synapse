import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Zap,
    Clock,
    Target,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatStudyTime } from '@/lib/utils';
import type { NextActionRecommendation } from '../../types/intelligence.types';
import { ModuleBadge } from '../shared/ModuleBadge';

interface NextActionCardProps {
    recommendation: NextActionRecommendation;
    onAction?: () => void;
}

/**
 * NextActionCard - AI-recommended "What to do next"
 *
 * Features:
 * - Prominent gradient design
 * - Priority visualization (progress ring)
 * - Time estimate
 * - Confidence score
 * - Reasoning explanation
 * - Module badge
 * - Item count (if applicable)
 */
export function NextActionCard({ recommendation, onAction }: NextActionCardProps) {
    const priorityColor = getPriorityGradient(recommendation.priority);

    return (
        <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        whileHover={{ scale: 1.03 }}
        >
        <Card className={cn(
            'relative overflow-hidden shadow-lg hover:shadow-xl transition-all',
            'border-2',
            priorityColor.border
        )}>
        {/* Gradient Background Overlay */}
        <div className={cn(
            'absolute inset-0 opacity-5',
            priorityColor.gradient
        )} />

        <CardContent className="relative p-6 space-y-4">
        {/* Header with Badge */}
        <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
        <motion.div
        animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
        }}
        transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
        }}
        >
        <Sparkles className={cn('h-5 w-5', priorityColor.text)} />
        </motion.div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Recommended Next
        </span>
        </div>

        <ModuleBadge moduleType={recommendation.moduleType} />
        </div>

        {/* Main Action */}
        <div className="space-y-2">
        <h3 className="text-xl font-bold leading-tight">
        {recommendation.title}
        </h3>
        <p className="text-sm text-muted-foreground">
        {recommendation.description}
        </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
        {/* Priority */}
        <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Target className="h-3 w-3" />
        <span>Priority</span>
        </div>
        <div className="flex items-center gap-2">
        <Progress
        value={recommendation.priority * 100}
        className="h-1.5 flex-1"
        // @ts-ignore
        indicatorClassName={priorityColor.progress}
        />
        <span className={cn('text-xs font-bold', priorityColor.text)}>
        {(recommendation.priority * 100).toFixed(0)}%
        </span>
        </div>
        </div>

        {/* Time Estimate */}
        <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Time</span>
        </div>
        <span className="text-sm font-semibold">
        {formatStudyTime(recommendation.estimatedMinutes)}
        </span>
        </div>

        {/* Confidence */}
        <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>Confidence</span>
        </div>
        <span className="text-sm font-semibold">
        {(recommendation.confidence * 100).toFixed(0)}%
        </span>
        </div>
        </div>

        {/* Item Count Badge (if applicable) */}
        {recommendation.itemCount && recommendation.itemCount > 1 && (
            <Badge variant="secondary" className="text-xs">
            {recommendation.itemCount} items
            </Badge>
        )}

        {/* Reasoning */}
        <div className="text-xs text-muted-foreground italic bg-muted/50 p-3 rounded-lg">
        💡 {recommendation.reasoning}
        </div>

        {/* Action Button */}
        <Button
        size="lg"
        className={cn(
            'w-full group text-base font-semibold',
            priorityColor.button
        )}
        onClick={onAction || (() => {
            window.location.href = recommendation.actionUrl;
        })}
        >
        Start Now
        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
        </CardContent>
        </Card>
        </motion.div>
    );
}

// Get priority-based color scheme
function getPriorityGradient(priority: number) {
    if (priority >= 0.8) {
        return {
            border: 'border-red-500',
            gradient: 'bg-gradient-to-br from-red-500 to-orange-500',
            text: 'text-red-600 dark:text-red-400',
            progress: 'bg-red-600',
            button: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white',
        };
    } else if (priority >= 0.6) {
        return {
            border: 'border-orange-500',
            gradient: 'bg-gradient-to-br from-orange-500 to-yellow-500',
            text: 'text-orange-600 dark:text-orange-400',
            progress: 'bg-orange-600',
            button: 'bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white',
        };
    } else if (priority >= 0.4) {
        return {
            border: 'border-blue-500',
            gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
            text: 'text-blue-600 dark:text-blue-400',
            progress: 'bg-blue-600',
            button: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white',
        };
    } else {
        return {
            border: 'border-gray-500',
            gradient: 'bg-gradient-to-br from-gray-500 to-slate-500',
            text: 'text-gray-600 dark:text-gray-400',
            progress: 'bg-gray-600',
            button: 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 text-white',
        };
    }
}
