/**
 * BranchNavigator - ChatGPT-style branch navigation
 *
 * Shows ← 2/4 → when a message has sibling branches.
 * Allows switching between alternate responses.
 *
 * Design principles:
 * - Quiet, not loud UI
 * - One dimension at a time (no tree visualization)
 * - Visible only when relevant
 */

import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BranchNavigatorProps {
    currentIndex: number;   // 1-indexed position
    totalBranches: number;
    onPrev: () => void;
    onNext: () => void;
    className?: string;
    compact?: boolean;      // Minimal style for inline use
}

export function BranchNavigator({
    currentIndex,
    totalBranches,
    onPrev,
    onNext,
    className,
    compact = false,
}: BranchNavigatorProps) {
    // Don't show if there's only one branch
    if (totalBranches <= 1) return null;

    const hasPrev = currentIndex > 1;
    const hasNext = currentIndex < totalBranches;

    if (compact) {
        // Compact inline style
        return (
            <div className={cn(
                "inline-flex items-center gap-1 text-xs text-muted-foreground",
                className
            )}>
                <button
                    onClick={onPrev}
                    disabled={!hasPrev}
                    className={cn(
                        "p-0.5 rounded hover:bg-white/10 transition-colors",
                        !hasPrev && "opacity-30 cursor-not-allowed"
                    )}
                    aria-label="Previous branch"
                >
                    <ChevronLeft className="size-3" />
                </button>
                <span className="font-mono tabular-nums min-w-[2rem] text-center">
                    {currentIndex}/{totalBranches}
                </span>
                <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className={cn(
                        "p-0.5 rounded hover:bg-white/10 transition-colors",
                        !hasNext && "opacity-30 cursor-not-allowed"
                    )}
                    aria-label="Next branch"
                >
                    <ChevronRight className="size-3" />
                </button>
            </div>
        );
    }

    // Full style with buttons
    return (
        <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg",
            "bg-zinc-900/50 border border-white/5",
            className
        )}>
            <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                disabled={!hasPrev}
                className="size-6 p-0"
                aria-label="Previous branch"
            >
                <ChevronLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-1.5 px-2 min-w-[3.5rem] justify-center">
                <GitBranch className="size-3 text-muted-foreground" />
                <span className="text-xs font-mono tabular-nums">
                    {currentIndex} / {totalBranches}
                </span>
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                disabled={!hasNext}
                className="size-6 p-0"
                aria-label="Next branch"
            >
                <ChevronRight className="size-4" />
            </Button>
        </div>
    );
}
