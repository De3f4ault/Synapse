/**
 * ThreadButton - Trigger button for opening the thread panel
 *
 * Shows thread count badge and opens the Grok-style panel.
 */

import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThreadStore } from '../state/threadStore';
import { cn } from '@/lib/utils';

interface ThreadButtonProps {
    className?: string;
}

export function ThreadButton({ className }: ThreadButtonProps) {
    const { togglePanel, isPanelOpen, threads, context } = useThreadStore();

    const threadCount = threads.length;
    const isInThread = context.mode === 'thread';

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={togglePanel}
            className={cn(
                "gap-2 h-8 px-3 relative",
                isPanelOpen && "bg-cyan-500/10 text-cyan-400",
                isInThread && "ring-1 ring-cyan-500/30",
                className
            )}
        >
            <MessageSquarePlus className="size-4" />
            <span className="text-sm">Threads</span>

            {/* Badge */}
            {threadCount > 0 && (
                <span className={cn(
                    "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1",
                    "text-[10px] font-medium rounded-full",
                    "flex items-center justify-center",
                    isInThread
                        ? "bg-cyan-500 text-white"
                        : "bg-muted text-muted-foreground"
                )}>
                    {threadCount > 99 ? '99+' : threadCount}
                </span>
            )}
        </Button>
    );
}
