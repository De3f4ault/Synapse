import { cn } from "@/lib/utils";
import { Skeleton } from "./SkeletonCard";

interface SkeletonListProps {
    count?: number;
    showAvatar?: boolean;
    showStatus?: boolean;
    className?: string;
}

/**
 * SkeletonList Component
 *
 * Placeholder skeleton for list items while loading.
 *
 * Features:
 * - Configurable row count
 * - Optional avatar circles
 * - Two-line content (title + subtitle)
 * - Right-aligned status indicator option
 * - Shimmer animation
 *
 * @example
 * // Basic list
 * <SkeletonList count={5} />
 *
 * // With avatars
 * <SkeletonList count={8} showAvatar />
 *
 * // With status indicators
 * <SkeletonList count={10} showAvatar showStatus />
 */
export function SkeletonList({
    count = 5,
    showAvatar = false,
    showStatus = false,
    className,
}: SkeletonListProps) {
    return (
        <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }).map((_, index) => (
            <SkeletonListItem
            key={index}
            showAvatar={showAvatar}
            showStatus={showStatus}
            />
        ))}
        </div>
    );
}

/**
 * Single skeleton list item
 */
function SkeletonListItem({
    showAvatar,
    showStatus,
}: {
    showAvatar?: boolean;
    showStatus?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card" aria-hidden="true">
        {/* Avatar */}
        {showAvatar && (
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        )}

        {/* Content */}
        <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        </div>

        {/* Status indicator */}
        {showStatus && <Skeleton className="h-6 w-16 rounded-full" />}
        </div>
    );
}

/**
 * SkeletonListCompact Component
 *
 * Compact list skeleton with single-line items
 */
export function SkeletonListCompact({
    count = 5,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }).map((_, index) => (
            <div
            key={index}
            className="flex items-center gap-2 p-2 rounded"
            aria-hidden="true"
            >
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            </div>
        ))}
        </div>
    );
}

/**
 * SkeletonListWithActions Component
 *
 * List skeleton with action buttons on the right
 */
export function SkeletonListWithActions({
    count = 5,
    showAvatar = false,
    className,
}: {
    count?: number;
    showAvatar?: boolean;
    className?: string;
}) {
    return (
        <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }).map((_, index) => (
            <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            aria-hidden="true"
            >
            {showAvatar && (
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            )}
            <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            </div>
            </div>
        ))}
        </div>
    );
}

/**
 * SkeletonListTree Component
 *
 * Tree/hierarchical list skeleton with indentation
 */
export function SkeletonListTree({
    count = 5,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div className={cn("space-y-1", className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }).map((_, index) => {
            // Random indentation for tree effect
            const indent = Math.floor(Math.random() * 3) * 20;
            const width = 60 + Math.random() * 30;

            return (
                <div
                key={index}
                className="flex items-center gap-2 p-2"
                style={{ paddingLeft: `${indent}px` }}
                aria-hidden="true"
                >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4" style={{ width: `${width}%` }} />
                </div>
            );
        })}
        </div>
    );
}
