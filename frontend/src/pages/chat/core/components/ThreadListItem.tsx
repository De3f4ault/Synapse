/**
 * ThreadListItem - Individual thread in the panel
 *
 * Displays thread title, message count, and last activity.
 * Click to switch context to that thread.
 */

import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThreadInfo } from '../state/threadStore';

interface ThreadListItemProps {
    thread: ThreadInfo;
    isActive: boolean;
    onClick: () => void;
}

export function ThreadListItem({ thread, isActive, onClick }: ThreadListItemProps) {
    const timeAgo = formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true });

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-3 rounded-lg transition-all group",
                "border border-transparent",
                isActive
                    ? "bg-cyan-500/10 border-cyan-500/30"
                    : "hover:bg-white/5 hover:border-white/10"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h4 className={cn(
                        "font-medium text-sm truncate",
                        isActive ? "text-cyan-300" : "text-foreground"
                    )}>
                        {thread.title}
                    </h4>

                    {/* Summary or message count */}
                    {thread.summary ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {thread.summary}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                            {thread.messageCount} messages
                        </p>
                    )}

                    {/* Timestamp */}
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        {timeAgo}
                    </p>
                </div>

                {/* Indicators */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className={cn(
                        "flex items-center gap-1 text-xs",
                        isActive ? "text-cyan-400" : "text-muted-foreground"
                    )}>
                        <MessageSquare className="size-3" />
                        <span>{thread.messageCount}</span>
                    </div>
                    <ChevronRight className={cn(
                        "size-4 opacity-0 group-hover:opacity-100 transition-opacity",
                        isActive ? "text-cyan-400 opacity-100" : "text-muted-foreground"
                    )} />
                </div>
            </div>
        </button>
    );
}
