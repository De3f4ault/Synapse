import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Clock,
    ChevronRight,
    X,
    Calendar,
    MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDueDate } from '../../utils/dateFormatters';
import { formatStudyTime } from '@/lib/utils';
import type { QueueItem as QueueItemType } from '../../types/queue.types';
import { ModuleBadge } from '../shared/ModuleBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QueueItemProps {
    item: QueueItemType;
    sectionColor: string;
    onClick?: () => void;
    onDismiss?: () => void;
    onSnooze?: (hours: number) => void;
}

/**
 * QueueItem - Single actionable item in focus queue
 *
 * Features:
 * - Module and priority badges
 * - Due date display
 * - Time estimate
 * - Progress indicator (for multi-step items)
 * - Context menu (snooze, dismiss)
 * - Click to navigate
 * - Hover effects
 */
export function QueueItem({
    item,
    sectionColor,
    onClick,
    onDismiss,
    onSnooze
}: QueueItemProps) {
    const borderColor = getBorderColor(sectionColor);

    return (
        <motion.div
        whileHover={{ scale: 1.01, x: 4 }}
        whileTap={{ scale: 0.99 }}
        >
        <Card
        className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            'border-l-4',
            borderColor
        )}
        onClick={onClick || (() => {
            window.location.href = item.actionUrl;
        })}
        >
        <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-2">
        {/* Header: Title & Badges */}
        <div className="flex items-start gap-2 flex-wrap">
        <h4 className="font-semibold text-sm truncate flex-1">
        {item.title}
        </h4>
        <div className="flex items-center gap-1.5">
        <ModuleBadge moduleType={item.moduleType} size="sm" />
        <PriorityBadge priority={item.priority} size="sm" />
        </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
        {item.description}
        </p>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        {/* Due Date */}
        {item.dueDate && (
            <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span className={cn(
                isDueToday(item.dueDate) && 'text-red-600 dark:text-red-400 font-semibold',
                                isOverdue(item.dueDate) && 'text-red-700 dark:text-red-300 font-bold'
            )}>
            {formatDueDate(item.dueDate)}
            </span>
            </div>
        )}

        {/* Time Estimate */}
        {item.estimatedMinutes && (
            <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatStudyTime(item.estimatedMinutes)}</span>
            </div>
        )}

        {/* Progress (if metadata contains progress info) */}
        {item.metadata?.progress !== undefined && (
            <div className="flex items-center gap-1">
            <span className="font-medium">
            {Math.round(item.metadata.progress * 100)}% complete
            </span>
            </div>
        )}
        </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
        {/* Context Menu */}
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={(e) => e.stopPropagation()}
        >
        <MoreVertical className="h-4 w-4" />
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onSnooze?.(1)}>
        Snooze 1 hour
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSnooze?.(24)}>
        Snooze 1 day
        </DropdownMenuItem>
        <DropdownMenuItem
        onClick={onDismiss}
        className="text-destructive"
        >
        Dismiss
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>

        {/* Navigate Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}

// Get border color based on section color
function getBorderColor(sectionColor: string): string {
    switch (sectionColor) {
        case 'red':
            return 'border-l-red-600';
        case 'orange':
            return 'border-l-orange-600';
        case 'blue':
            return 'border-l-blue-600';
        case 'gray':
        default:
            return 'border-l-gray-400';
    }
}

// Check if due today
function isDueToday(dueDate: string): boolean {
    const due = new Date(dueDate);
    const today = new Date();
    return (
        due.getDate() === today.getDate() &&
        due.getMonth() === today.getMonth() &&
        due.getFullYear() === today.getFullYear()
    );
}

// Check if overdue
function isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
}
