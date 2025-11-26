import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
 * QueueSection - Collapsible section for grouped queue items
 *
 * Features:
 * - Color-coded by priority level
 * - Collapsible with smooth animation
 * - Item count badge
 * - Staggered item animations
 * - Section-specific styling
 */
export function QueueSection({
    section,
    onItemClick,
    onDismiss,
    defaultExpanded = true
}: QueueSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const colorScheme = getSectionColorScheme(section.color);

    return (
        <div className="space-y-2">
        {/* Section Header */}
        <Button
        variant="ghost"
        className={cn(
            'w-full justify-between p-3 h-auto group',
            'hover:bg-opacity-10 transition-all'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        >
        <div className="flex items-center gap-3">
        {/* Color Indicator */}
        <div className={cn(
            'w-1 h-8 rounded-full',
            colorScheme.indicator
        )} />

        {/* Title and Count */}
        <div className="flex items-center gap-2">
        <h3 className="font-semibold text-sm">
        {section.title}
        </h3>
        <Badge
        variant="secondary"
        className={cn(
            'text-xs',
            colorScheme.badge
        )}
        >
        {section.items.length}
        </Badge>
        </div>
        </div>

        {/* Expand/Collapse Icon */}
        <motion.div
        animate={{ rotate: isExpanded ? 0 : -90 }}
        transition={{ duration: 0.2 }}
        >
        {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        </motion.div>
        </Button>

        {/* Items List with Animation */}
        <AnimatePresence initial={false}>
        {isExpanded && (
            <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-2 overflow-hidden"
            >
            {section.items.map((item, index) => (
                <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{
                    duration: 0.2,
                    delay: index * 0.05
                }}
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

// Get color scheme based on section color
function getSectionColorScheme(color: string) {
    switch (color) {
        case 'red':
            return {
                indicator: 'bg-red-600',
                badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
            };
        case 'orange':
            return {
                indicator: 'bg-orange-600',
                badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
            };
        case 'blue':
            return {
                indicator: 'bg-blue-600',
                badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
            };
        case 'gray':
        default:
            return {
                indicator: 'bg-gray-400',
                badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
            };
    }
}
