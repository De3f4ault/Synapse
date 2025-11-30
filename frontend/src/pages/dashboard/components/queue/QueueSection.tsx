import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueueSection as QueueSectionType } from '../../types/queue.types';
import { QueueItem } from './QueueItem';

interface QueueSectionProps {
    section: QueueSectionType;
    onItemClick?: (itemId: string) => void;
    onDismiss?: (itemId: string) => void;
    defaultExpanded?: boolean;
}

/**
 * QueueSection - "Tactical Group" Style
 * Minimal headers with neon indicators.
 */
export function QueueSection({
    section,
    onItemClick,
    onDismiss,
    defaultExpanded = true
}: QueueSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const colorClass = getSectionColor(section.color);

    return (
        <div className="space-y-1">
        <Button
        variant="ghost"
        className="w-full justify-between p-2 h-auto hover:bg-white/5 group rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
        >
        <div className="flex items-center gap-2">
        <Circle className={cn("w-2 h-2 fill-current", colorClass)} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors">
        {section.title}
        </span>
        <span className="text-[10px] text-slate-600 font-mono ml-1">
        [{section.items.length}]
        </span>
        </div>

        {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
        </Button>

        <AnimatePresence initial={false}>
        {isExpanded && (
            <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-2 pl-2 border-l border-white/5 ml-3"
            >
            {section.items.map((item, index) => (
                <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                >
                <QueueItem
                item={item}
                sectionColor={section.color}
                onClick={() => onItemClick?.(item.id)}
                onDismiss={() => onDismiss?.(item.id)}
                />
                </motion.div>
            ))}
            </motion.div>
        )}
        </AnimatePresence>
        </div>
    );
}

function getSectionColor(color: string) {
    switch (color) {
        case 'red': return 'text-red-500';
        case 'orange': return 'text-orange-500';
        case 'blue': return 'text-blue-500';
        default: return 'text-slate-500';
    }
}
