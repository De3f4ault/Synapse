import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    BookOpen,
    FileText,
    MessageSquare,
    CreditCard,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import { useSessionTracking } from '../../hooks/useSessionTracking';
import { formatRelativeTime } from '@/lib/utils';
import { ModuleBadge } from '../shared/ModuleBadge';

/**
 * ActivityFeed - Live activity stream
 *
 * Features:
 * - Real-time activity list (last 20 items)
 * - Activity type icons (review, note, upload, etc.)
 * - Relative timestamps ("2 minutes ago")
 * - Clickable items (navigate to resource) - future enhancement
 * - Auto-scroll on new items
 * - Grouped by time periods (Today, Yesterday, etc.)
 *
 * Data Source: WebSocket ws://localhost:8000/ws/activity (via useSessionTracking)
 */
export function ActivityFeed() {
    const { activityLog, isInSession, currentSession } = useSessionTracking();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new activity arrives
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activityLog.length]);

    // Group activities by time period
    const groupedActivities = groupActivitiesByTime(activityLog);

    return (
        <Card className="h-full flex flex-col">
        <CardHeader>
        <div className="flex items-center justify-between">
        <div>
        <CardTitle>Activity Feed</CardTitle>
        <CardDescription>Recent learning activity</CardDescription>
        </div>
        {isInSession && currentSession && (
            <Badge variant="secondary" className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Active Session
            </Badge>
        )}
        </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea ref={scrollRef} className="h-full px-6 pb-6">
        {activityLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
            No recent activity
            </p>
            <p className="text-xs text-muted-foreground">
            Start studying to see your activity here
            </p>
            </div>
        ) : (
            <div className="space-y-6">
            {Object.entries(groupedActivities).map(([period, activities]) => (
                <div key={period} className="space-y-3">
                {/* Time Period Header */}
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {period}
                </h4>

                {/* Activity List */}
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
            ))}
            </div>
        )}
        </ScrollArea>
        </CardContent>
        </Card>
    );
}

/**
 * Individual activity item
 */
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

    return (
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        layout
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        {icon}
        </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
        <ModuleBadge module={activity.module} size="sm" />
        <span className="text-xs text-muted-foreground">{relativeTime}</span>
        </div>
        <p className="text-sm font-medium truncate">{description}</p>
        {activity.resource_title && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
            {activity.resource_title}
            </p>
        )}
        </div>

        {/* Completion indicator */}
        {activity.activity_type === 'review' && (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
        )}
        </motion.div>
    );
}

/**
 * Get icon for activity type
 */
function getActivityIcon(module: string, activityType: string) {
    const iconClass = 'h-4 w-4 text-primary';

    if (activityType === 'review') {
        return <CreditCard className={iconClass} />;
    }

    switch (module) {
        case 'flashcards':
            return <CreditCard className={iconClass} />;
        case 'notes':
            return <BookOpen className={iconClass} />;
        case 'documents':
            return <FileText className={iconClass} />;
        case 'chat':
            return <MessageSquare className={iconClass} />;
        default:
            return <Clock className={iconClass} />;
    }
}

/**
 * Get human-readable activity description
 */
function getActivityDescription(activity: {
    activity_type: string;
    module: string;
    resource_title?: string;
}): string {
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

/**
 * Group activities by time period (Today, Yesterday, This Week, Older)
 */
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
