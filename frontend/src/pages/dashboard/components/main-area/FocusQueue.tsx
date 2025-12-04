import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListTodo } from 'lucide-react';
import { formatStudyTime } from '@/lib/utils';
import type { DashboardData } from '../../types/dashboard.types';
import { useFocusQueue } from '../../hooks/useFocusQueue';
import { QueueSection } from '../queue/QueueSection';
import { QueueEmpty } from '../queue/QueueEmpty';

interface FocusQueueProps {
    data: DashboardData | undefined;
}

/**
 * FocusQueue - "Mission Log" (Right Sidebar)
 */
export function FocusQueue({ data }: FocusQueueProps) {
    const queue = useFocusQueue(data);

    if (queue.isLoading) return <div className="h-full flex items-center justify-center dashboard-glass rounded-2xl"><ListTodo className="animate-pulse text-emerald-500" /></div>;
    if (queue.isEmpty) return <QueueEmpty />;

    return (
        <div className="h-full flex flex-col dashboard-glass rounded-2xl overflow-hidden border border-white/5">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
        <ListTodo className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold text-white tracking-widest uppercase">Mission Log</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
        {queue.stats.totalItems} ACTIVE
        </span>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/5 shrink-0">
        <div className="p-3 bg-[#0A0A0A]/50 flex flex-col items-center">
        <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Due Today</span>
        <span className="text-sm font-bold text-white">{queue.stats.dueToday}</span>
        </div>
        <div className="p-3 bg-[#0A0A0A]/50 flex flex-col items-center">
        <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Est. Time</span>
        <span className="text-sm font-bold text-emerald-400 font-mono">{formatStudyTime(queue.stats.estimatedTotalMinutes)}</span>
        </div>
        </div>

        {/* Queue List */}
        <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
        {queue.sections.map((section, index) => (
            <motion.div
            key={section.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            >
            <QueueSection
            section={section}
            onItemClick={(itemId) => {
                const item = queue.allItems.find(i => i.id === itemId);
                if (item) window.location.href = item.actionUrl;
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
