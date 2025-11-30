import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PriorityLevel } from '../../types/dashboard.types';

interface PriorityBadgeProps {
    priority: PriorityLevel;
    className?: string;
    showIcon?: boolean;
    size?: 'sm' | 'default';
}

const PRIORITY_ICONS = {
    urgent: AlertCircle,
    high: AlertTriangle,
    medium: Info,
    low: Circle,
};

/**
 * PriorityBadge - Neon Style
 */
export function PriorityBadge({ priority, className, showIcon = true, size = 'default' }: PriorityBadgeProps) {
    const Icon = PRIORITY_ICONS[priority];
    const colors = getPriorityColors(priority);

    return (
        <Badge
        variant="outline"
        className={cn(
            'flex items-center gap-1 border font-mono font-bold uppercase tracking-tight',
            colors.bg,
            colors.text,
            colors.border,
            size === 'sm' ? 'text-[9px] px-1 h-4' : 'text-[10px] px-2 h-5',
            className
        )}
        >
        {showIcon && <Icon className={cn(size === 'sm' ? 'w-2 h-2' : 'w-3 h-3')} />}
        <span>{priority}</span>
        </Badge>
    );
}

function getPriorityColors(priority: PriorityLevel) {
    switch (priority) {
        case 'urgent': return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' };
        case 'high': return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' };
        case 'medium': return { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' };
        case 'low': return { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/30' };
    }
}

export function PriorityDot({ priority, className }: { priority: PriorityLevel; className?: string }) {
    const colors = getPriorityColors(priority);
    return (
        <div className={cn('h-1.5 w-1.5 rounded-full', colors.bg.replace('/10', ''), colors.text.replace('text-', 'bg-'), className)} />
    );
}
