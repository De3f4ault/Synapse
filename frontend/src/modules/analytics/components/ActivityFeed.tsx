import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import {
    CheckCircle,
    BookOpen,
    FileText,
    Upload,
    MessageSquare,
    Layers,
} from 'lucide-react';

/**
 * ActivityFeed Component
 *
 * Displays recent user activity in a timeline format.
 * Shows various activity types with icons and timestamps.
 *
 * Features:
 * - Timeline layout with connecting lines
 * - Activity type icons and colors
 * - Relative timestamps (5m ago, 2h ago)
 * - Stagger animation on mount
 * - Loading skeleton states
 * - Empty state handling
 */

export interface Activity {
    id: number;
    type: 'review' | 'note' | 'document' | 'chat' | 'deck' | 'quiz';
    title: string;
    description?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
    activities?: Activity[];
    isLoading?: boolean;
    limit?: number;
    className?: string;
}

const ACTIVITY_CONFIG = {
    review: {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        label: 'Reviewed',
    },
    deck: {
        icon: Layers,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Deck',
    },
    note: {
        icon: FileText,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        label: 'Note',
    },
    document: {
        icon: Upload,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        label: 'Document',
    },
    chat: {
        icon: MessageSquare,
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/10',
        label: 'Chat',
    },
    quiz: {
        icon: BookOpen,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10',
        label: 'Quiz',
    },
};

function ActivityItem({ activity, index }: { activity: Activity; index: number }) {
    const config = ACTIVITY_CONFIG[activity.type];
    const Icon = config.icon;

    return (
        <motion.div
        className="relative flex gap-3 pb-6 last:pb-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
            duration: 0.3,
            delay: index * 0.05,
            ease: 'easeOut',
        }}
        >
        {/* Timeline line */}
        <div className="relative flex flex-col items-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}>
        <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        {/* Connecting line (hidden for last item) */}
        <div className="absolute top-10 h-full w-px bg-border" />
        </div>

        {/* Content */}
        <div className="flex-1 pt-1">
        <div className="flex items-start justify-between">
        <div className="flex-1">
        <p className="font-medium text-sm leading-tight">
        {activity.title}
        </p>
        {activity.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
            {activity.description}
            </p>
        )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
        {formatRelativeTime(activity.timestamp)}
        </span>
        </div>
        </div>
        </motion.div>
    );
}

function ActivitySkeleton() {
    return (
        <div className="relative flex gap-3 pb-6">
        <div className="relative flex flex-col items-center">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="absolute top-10 h-full w-px bg-border" />
        </div>
        <div className="flex-1 pt-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        </div>
        </div>
    );
}

export function ActivityFeed({
    activities = [],
    isLoading = false,
    limit = 10,
    className,
}: ActivityFeedProps) {
    if (isLoading) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <ActivitySkeleton key={i} />
            ))}
            </div>
            </CardContent>
            </Card>
        );
    }

    if (activities.length === 0) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
            <CheckCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
            Start studying to see your activity here
            </p>
            </div>
            </CardContent>
            </Card>
        );
    }

    const displayActivities = activities.slice(0, limit);

    return (
        <Card className={className}>
        <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="relative">
        {displayActivities.map((activity, index) => (
            <ActivityItem
            key={activity.id}
            activity={activity}
            index={index}
            />
        ))}
        </div>
        {activities.length > limit && (
            <div className="mt-4 text-center">
            <button className="text-sm text-primary hover:underline">
            View all activity
            </button>
            </div>
        )}
        </CardContent>
        </Card>
    );
}

export default ActivityFeed;
