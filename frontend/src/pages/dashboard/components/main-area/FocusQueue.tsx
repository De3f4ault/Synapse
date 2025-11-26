import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Clock, Target } from 'lucide-react';
import { formatStudyTime } from '@/lib/utils';
import type { DashboardData } from '../../types/dashboard.types';
import { useFocusQueue } from '../../hooks/useFocusQueue';
import { QueueSection } from '../queue/QueueSection';
import { QueueEmpty } from '../queue/QueueEmpty';

interface FocusQueueProps {
    data: DashboardData | undefined;
}

/**
 * FocusQueue - Right panel with prioritized action queue
 *
 * Features:
 * - Sections grouped by priority (Due Today, High Priority, etc.)
 * - Queue statistics
 * - Time estimates
 * - Item actions (dismiss, snooze)
 */
export function FocusQueue({ data }: FocusQueueProps) {
    const queue = useFocusQueue(data);

    if (queue.isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
            <ListTodo className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">
            Building your queue...
            </p>
            </div>
            </div>
        );
    }

    if (queue.isEmpty) {
        return <QueueEmpty />;
    }

    return (
        <div className="h-full flex flex-col">
        {/* Header with Stats */}
        <div className="p-4 space-y-3 border-b">
        <div className="flex items-center gap-2">
        <ListTodo className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Focus Queue</h2>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
        <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Target className="h-3 w-3" />
        <span>Total Items</span>
        </div>
        <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">
        {queue.stats.totalItems}
        </span>
        {queue.stats.dueToday > 0 && (
            <Badge variant="destructive" className="text-xs">
            {queue.stats.dueToday} due
            </Badge>
        )}
        </div>
        </div>
        </Card>

        <Card className="p-3">
        <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Est. Time</span>
        </div>
        <span className="text-2xl font-bold">
        {formatStudyTime(queue.stats.estimatedTotalMinutes)}
        </span>
        </div>
        </Card>
        </div>

        {/* Module Breakdown */}
        <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(queue.stats.byModule).map(([module, count]) => {
            if (count === 0) return null;
            return (
                <Badge key={module} variant="secondary" className="text-xs">
                {module}: {count}
                </Badge>
            );
        })}
        </div>
        </div>

        {/* Queue Sections */}
        <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
        {queue.sections.map((section, index) => (
            <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            >
            <QueueSection
            section={section}
            onItemClick={(itemId) => {
                const item = queue.allItems.find(i => i.id === itemId);
                if (item) {
                    window.location.href = item.actionUrl;
                }
            }}
            onDismiss={queue.dismissItem}
            defaultExpanded={section.id === 'due-today' || section.id === 'high-priority'}
            />
            </motion.div>
        ))}
        </div>
        </ScrollArea>
        </div>
    );
}
