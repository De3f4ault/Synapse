import { Badge } from '@/components/ui/badge';
import { PRIORITY_COLORS } from '../../constants/colors';
import { AlertCircle, AlertTriangle, Info, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PriorityLevel } from '../../types/dashboard.types';

interface PriorityBadgeProps {
    priority: PriorityLevel;
    className?: string;
    showIcon?: boolean;
}

const PRIORITY_ICONS = {
    urgent: AlertCircle,
    high: AlertTriangle,
    medium: Info,
    low: Circle,
} as const;

const PRIORITY_LABELS = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
} as const;

/**
 * Badge component for displaying priority level
 * Color-coded with urgency indicators
 */
export function PriorityBadge({ priority, className, showIcon = true }: PriorityBadgeProps) {
    const Icon = PRIORITY_ICONS[priority];
    const colors = PRIORITY_COLORS[priority];
    const label = PRIORITY_LABELS[priority];

    return (
        <Badge
        variant="outline"
        className={cn(
            'flex items-center gap-1',
            colors.text,
            colors.bg,
            colors.border,
            className
        )}
        >
        {showIcon && <Icon className="h-3 w-3" />}
        <span className="text-xs font-medium">{label}</span>
        </Badge>
    );
}

/**
 * Priority indicator dot (for compact display)
 */
export function PriorityDot({ priority, className }: { priority: PriorityLevel; className?: string }) {
    const colors = PRIORITY_COLORS[priority];

    return (
        <div
        className={cn('h-2 w-2 rounded-full', colors.bg, className)}
        title={PRIORITY_LABELS[priority]}
        />
    );
}
