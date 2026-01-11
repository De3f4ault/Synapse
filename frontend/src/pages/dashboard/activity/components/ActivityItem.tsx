/**
 * ActivityItem - Single activity event in the feed
 * 
 * Displays:
 * - Icon based on activity type
 * - Title and description
 * - Timestamp with relative formatting
 * - Contextual action (if available)
 */

import {
    Brain,
    FileText,
    FileEdit,
    GraduationCap,
    MessageSquare,
    Trophy,
    Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry } from "../hooks/useSessionTracking";

interface ActivityItemProps {
    activity: ActivityLogEntry;
    index: number;
}

export function ActivityItem({ activity, index }: ActivityItemProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case "review":
            case "flashcard":
                return Zap;
            case "document":
                return FileText;
            case "note":
                return FileEdit;
            case "quiz":
                return GraduationCap;
            case "chat":
                return MessageSquare;
            case "achievement":
                return Trophy;
            default:
                return Brain;
        }
    };

    const Icon = getIcon(activity.activity_type);
    const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
        addSuffix: true,
    });

    // Generate title from resource_title or activity_type
    const title = activity.resource_title || `${activity.activity_type} in ${activity.module}`;
    // Generate description from module
    const description = `${activity.module} activity`;

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-all border border-transparent hover:bg-white/5",
                "animate-in slide-in-from-left-2 fade-in duration-300"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className={cn(
                "w-8 h-8 rounded-lg nm-inset flex items-center justify-center shrink-0",
                activity.activity_type === "achievement" ? "text-yellow-400" : "text-cyan-400"
            )}>
                <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-200 truncate">
                        {title}
                    </h4>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap font-mono">
                        {timeAgo}
                    </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                    {description}
                </p>
            </div>
        </div>
    );
}

