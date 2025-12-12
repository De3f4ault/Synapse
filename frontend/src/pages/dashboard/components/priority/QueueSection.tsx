/**
 * QueueSection - Grouped queue items by priority
 * Displays a section of prioritized items
 */

import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PriorityItem } from './PriorityItem';
import type { QueueSection as QueueSectionType } from '../../types/priority.types';

interface QueueSectionProps {
    section: QueueSectionType;
    index: number;
}

export function QueueSection({ section, index }: QueueSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const getSectionColor = () => {
        switch (section.color) {
            case 'red':
                return 'border-red-500/30 bg-red-500/5';
            case 'orange':
                return 'border-orange-500/30 bg-orange-500/5';
            case 'blue':
                return 'border-cyan-500/30 bg-cyan-500/5';
            case 'gray':
                return 'border-slate-500/30 bg-slate-500/5';
            default:
                return 'border-white/10 bg-white/5';
        }
    };

    const getHeaderColor = () => {
        switch (section.color) {
            case 'red':
                return 'text-red-400';
            case 'orange':
                return 'text-orange-400';
            case 'blue':
                return 'text-cyan-400';
            case 'gray':
                return 'text-slate-400';
            default:
                return 'text-white';
        }
    };

    if (section.items.length === 0) return null;

    return (
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
            "rounded-lg border overflow-hidden",
            getSectionColor()
        )}
        >
        {/* Section Header */}
        <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
        <div className="flex items-center gap-2">
        <h4 className={cn("font-semibold uppercase text-sm tracking-wide", getHeaderColor())}>
        {section.title}
        </h4>
        <span className="text-xs text-slate-500">
        ({section.items.length})
        </span>
        </div>
        {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
        </button>

        {/* Section Items */}
        {isExpanded && (
            <div className="px-4 pb-3 space-y-2">
            {section.items.map((item, itemIndex) => (
                <PriorityItem
                key={item.id}
                item={item}
                index={itemIndex}
                />
            ))}
            </div>
        )}
        </motion.div>
    );
}
