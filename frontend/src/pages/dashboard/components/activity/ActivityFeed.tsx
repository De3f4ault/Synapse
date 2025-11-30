import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    BookOpen,
    FileText,
    MessageSquare,
    Zap,
    Clock,
    Activity,
    Sparkles
} from 'lucide-react';
import { useSessionTracking } from '../../hooks/useSessionTracking';
import { formatRelativeTime, cn } from '@/lib/utils';

/**
 * ActivityFeed - "Cortex Feed" Style
 * FIXED: Removed dynamic Tailwind classes, using static color mapping
 */
export function ActivityFeed() {
    const { activityLog, isInSession } = useSessionTracking();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activityLog.length]);

    const groupedActivities = groupActivitiesByTime(activityLog);

    return (
        <div className="h-full flex flex-col dashboard-glass rounded-2xl overflow-hidden relative">
        {/* Header - Matches Intelligence Panel Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
        <div className={cn(
            "p-2 rounded-xl border",
            isInSession
            ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
            : "bg-slate-500/10 border-slate-500/20 text-slate-400"
        )}>
        <Activity className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold text-white tracking-widest uppercase">
        System Activity
        </span>
        </div>
        {isInSession && (
            <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            </div>
        )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
        {/* Cinematic Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-10 z-10" />

        <ScrollArea ref={scrollRef} className="h-full px-4 pb-4">
        {activityLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 opacity-50">
            <Sparkles className="h-8 w-8 text-slate-500" />
            <p className="text-xs text-slate-500 font-mono tracking-wider">NO DATA STREAM</p>
            </div>
        ) : (
            <div className="space-y-6 pt-4">
            {Object.entries(groupedActivities).map(([period, activities]) => (
                <div key={period} className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 opacity-70">
                {period}
                </h4>

                <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => (
                    <ActivityItem
                    key={activity.id}
                    activity={activity}
                    index={index}
                    />
                ))}
                </AnimatePresence>
                </div>
                </div>
            ))}
            </div>
        )}
        </ScrollArea>
        </div>
        </div>
    );
}

interface ActivityItemProps {
    activity: {
        id: string;
        timestamp: string;
        activity_type: string;
        module: string;
        resource_id?: number;
        resource_title?: string;
        metadata?: Record<string, unknown>;
    };
    index: number;
}

function ActivityItem({ activity, index }: ActivityItemProps) {
    const icon = getActivityIcon(activity.module, activity.activity_type);
    const description = getActivityDescription(activity);
    const relativeTime = formatRelativeTime(activity.timestamp);

    // FIXED: Get static color classes based on module
    const colors = getModuleColorClasses(activity.module);

    return (
        <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        layout
        className={cn(
            "group relative p-3 rounded-xl border transition-all cursor-pointer overflow-hidden",
            "bg-white/5 border-white/5 hover:bg-white/10",
            colors.border
        )}
        >
        {/* Hover Glow Effect */}
        <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity",
            colors.bg
        )} />

        <div className="flex items-start gap-3 relative z-10">
        <div className={cn(
            "p-2 rounded-lg flex items-center justify-center border",
            colors.iconBg,
            colors.iconBorder,
            colors.iconText
        )}>
        {icon}
        </div>

        <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
        {activity.resource_title || 'Unknown Resource'}
        </span>
        <span className="text-[9px] text-slate-500 font-mono ml-2 whitespace-nowrap">
        {relativeTime}
        </span>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed truncate">
        {description}
        </p>
        </div>
        </div>
        </motion.div>
    );
}

function getActivityIcon(module: string, activityType: string) {
    const iconClass = "w-3 h-3";

    if (activityType === 'review') return <Zap className={iconClass} />;

    switch (module) {
        case 'flashcards': return <Zap className={iconClass} />;
        case 'notes': return <BookOpen className={iconClass} />;
        case 'documents': return <FileText className={iconClass} />;
        case 'chat': return <MessageSquare className={iconClass} />;
        default: return <Clock className={iconClass} />;
    }
}

// FIXED: Return static Tailwind classes instead of dynamic ones
function getModuleColorClasses(module: string) {
    switch (module) {
        case 'flashcards':
            return {
                bg: 'bg-purple-500',
                border: 'border-purple-500/20',
                iconBg: 'bg-purple-500/10',
                iconBorder: 'border-purple-500/20',
                iconText: 'text-purple-400'
            };
        case 'notes':
            return {
                bg: 'bg-emerald-500',
                border: 'border-emerald-500/20',
                iconBg: 'bg-emerald-500/10',
                iconBorder: 'border-emerald-500/20',
                iconText: 'text-emerald-400'
            };
        case 'documents':
            return {
                bg: 'bg-cyan-500',
                border: 'border-cyan-500/20',
                iconBg: 'bg-cyan-500/10',
                iconBorder: 'border-cyan-500/20',
                iconText: 'text-cyan-400'
            };
        case 'chat':
            return {
                bg: 'bg-amber-500',
                border: 'border-amber-500/20',
                iconBg: 'bg-amber-500/10',
                iconBorder: 'border-amber-500/20',
                iconText: 'text-amber-400'
            };
        default:
            return {
                bg: 'bg-slate-500',
                border: 'border-slate-500/20',
                iconBg: 'bg-slate-500/10',
                iconBorder: 'border-slate-500/20',
                iconText: 'text-slate-400'
            };
    }
}

function getActivityDescription(activity: any): string {
    const { activity_type, module, resource_title } = activity;

    switch (activity_type) {
        case 'view':
            return `Viewed ${module}`;
        case 'review':
            return `Reviewed ${resource_title || 'flashcard'}`;
        case 'create':
            return `Created new ${module.slice(0, -1)}`;
        case 'update':
            return `Updated ${resource_title || module.slice(0, -1)}`;
        case 'delete':
            return `Deleted ${resource_title || module.slice(0, -1)}`;
        default:
            return `Activity in ${module}`;
    }
}

function groupActivitiesByTime(
    activities: Array<{
        id: string;
        timestamp: string;
        [key: string]: unknown;
    }>
): Record<string, typeof activities> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const grouped: Record<string, typeof activities> = {
        Today: [],
        Yesterday: [],
        'This Week': [],
        Older: [],
    };

    activities.forEach((activity) => {
        const activityDate = new Date(activity.timestamp);
        activityDate.setHours(0, 0, 0, 0);

        if (activityDate.getTime() === today.getTime()) {
            grouped.Today.push(activity);
        } else if (activityDate.getTime() === yesterday.getTime()) {
            grouped.Yesterday.push(activity);
        } else if (activityDate >= thisWeek) {
            grouped['This Week'].push(activity);
        } else {
            grouped.Older.push(activity);
        }
    });

    // Remove empty groups
    Object.keys(grouped).forEach((key) => {
        if (grouped[key].length === 0) {
            delete grouped[key];
        }
    });

    return grouped;
}
