/**
 * ThreadListItem - DeepSeek-style conversation history entry
 *
 * Dense single-line entry that fills available panel width.
 * Title text runs to edge before truncating with ellipsis.
 * Minimal vertical padding. Active state: subtle bg highlight.
 */

import { cn } from '@/lib/utils';
import type { ThreadInfo } from '../state/threadStore';

interface ThreadListItemProps {
    thread: ThreadInfo;
    isActive: boolean;
    onClick: () => void;
}

export function ThreadListItem({ thread, isActive, onClick }: ThreadListItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left px-3 py-[7px] rounded transition-colors",
                "text-[13px] leading-[1.3] truncate block",
                isActive
                    ? "bg-white/[0.08] text-zinc-100"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
            )}
            title={thread.title || 'Untitled thread'}
        >
            {thread.title || 'Untitled thread'}
        </button>
    );
}
