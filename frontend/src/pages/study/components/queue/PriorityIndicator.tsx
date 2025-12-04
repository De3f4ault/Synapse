/**
 * PriorityIndicator - Visual indicators for item priority
 *
 * Provides multiple ways to display priority:
 * - Dot indicator
 * - Bar indicator
 * - Badge
 */

import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles, Clock } from 'lucide-react';
import type { StudyPriority } from '../../types/study.types';
import { getPriorityColor, getPriorityBadgeVariant } from '../../utils/priorityEngine';

interface PriorityIndicatorProps {
    priority: StudyPriority;
    variant?: 'dot' | 'bar' | 'badge';
    showLabel?: boolean;
}

export function PriorityIndicator({
    priority,
    variant = 'dot',
    showLabel = false
}: PriorityIndicatorProps) {
    if (variant === 'dot') {
        return <PriorityDot priority={priority} showLabel={showLabel} />;
    }

    if (variant === 'bar') {
        return <PriorityBar priority={priority} />;
    }

    return <PriorityBadge priority={priority} />;
}

/**
 * Dot indicator with optional label
 */
export function PriorityDot({
    priority,
    showLabel = false
}: {
    priority: StudyPriority;
    showLabel?: boolean;
}) {
    const colors = {
        high: 'bg-red-500',
        new: 'bg-purple-500',
        normal: 'bg-blue-500',
        low: 'bg-gray-400',
    };

    const labels = {
        high: 'Urgent',
        new: 'New',
        normal: 'Normal',
        low: 'Low Priority',
    };

    return (
        <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${colors[priority]}`} />
        {showLabel && (
            <span className="text-xs text-muted-foreground">
            {labels[priority]}
            </span>
        )}
        </div>
    );
}

/**
 * Bar indicator showing priority level
 */
export function PriorityBar({ priority }: { priority: StudyPriority }) {
    const heights = {
        high: 'h-full',
        new: 'h-3/4',
        normal: 'h-1/2',
        low: 'h-1/4',
    };

    const colors = {
        high: 'bg-red-500',
        new: 'bg-purple-500',
        normal: 'bg-blue-500',
        low: 'bg-gray-400',
    };

    return (
        <div className="flex items-end gap-0.5 h-4">
        <div className={`w-1 ${heights[priority]} ${colors[priority]} rounded-t`} />
        <div className={`w-1 ${priority === 'high' ? heights.high : 'h-1/2'} ${priority === 'high' ? colors.high : 'bg-gray-300'} rounded-t`} />
        <div className={`w-1 ${priority === 'high' ? heights.high : 'h-1/4'} ${priority === 'high' ? colors.high : 'bg-gray-300'} rounded-t`} />
        </div>
    );
}

/**
 * Badge with icon and label
 */
export function PriorityBadge({ priority }: { priority: StudyPriority }) {
    const icons = {
        high: AlertCircle,
        new: Sparkles,
        normal: Clock,
        low: Clock,
    };

    const labels = {
        high: 'Urgent',
        new: 'New',
        normal: 'Normal',
        low: 'Low',
    };

    const Icon = icons[priority];
    const variant = getPriorityBadgeVariant(priority);

    return (
        <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {labels[priority]}
        </Badge>
    );
}
