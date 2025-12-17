import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
    variant?: "default" | "compact" | "detailed";
    count?: number;
    showImage?: boolean;
    showActions?: boolean;
    className?: string;
}

/**
 * SkeletonCard Component
 *
 * Placeholder card skeleton while data is loading.
 * Matches the structure of actual content cards to prevent layout shift.
 *
 * Features:
 * - Multiple variants (default, compact, detailed)
 * - Shimmer animation effect
 * - Optional image placeholder
 * - Optional action buttons placeholder
 * - Render multiple cards at once
 * - Responsive sizing
 *
 * @example
 * // Single card
 * <SkeletonCard />
 *
 * // Multiple cards in grid
 * <div className="grid grid-cols-3 gap-4">
 *   <SkeletonCard count={6} variant="compact" />
 * </div>
 *
 * // With image
 * <SkeletonCard variant="detailed" showImage showActions />
 */
export function SkeletonCard({
    variant = "default",
    count = 1,
    showImage = false,
    showActions = false,
    className,
}: SkeletonCardProps) {
    if (count > 1) {
        return (
            <>
                {Array.from({ length: count }).map((_, index) => (
                    <SkeletonCard
                        key={index}
                        variant={variant}
                        showImage={showImage}
                        showActions={showActions}
                        className={className}
                    />
                ))}
            </>
        );
    }

    return (
        <Card className={cn("overflow-hidden", className)} aria-busy="true" aria-label="Loading">
            {variant === "compact" && <SkeletonCompact showImage={showImage} />}
            {variant === "default" && (
                <SkeletonDefault showImage={showImage} showActions={showActions} />
            )}
            {variant === "detailed" && (
                <SkeletonDetailed showImage={showImage} showActions={showActions} />
            )}
        </Card>
    );
}

/**
 * Compact variant: Title only, reduced padding
 */
function SkeletonCompact({ showImage }: { showImage?: boolean }) {
    return (
        <CardHeader className="space-y-2 p-4">
            {showImage && <Skeleton className="h-32 w-full rounded-md" />}
            <Skeleton className="h-5 w-3/4" />
        </CardHeader>
    );
}

/**
 * Default variant: Title + subtitle
 */
function SkeletonDefault({
    showImage,
    showActions,
}: {
    showImage?: boolean;
    showActions?: boolean;
}) {
    return (
        <>
            <CardHeader className="space-y-2">
                {showImage && <Skeleton className="h-48 w-full rounded-md mb-4" />}
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
            </CardHeader>
            {showActions && (
                <CardFooter className="gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                </CardFooter>
            )}
        </>
    );
}

/**
 * Detailed variant: Title + subtitle + content lines
 */
function SkeletonDetailed({
    showImage,
    showActions,
}: {
    showImage?: boolean;
    showActions?: boolean;
}) {
    return (
        <>
            <CardHeader className="space-y-2">
                {showImage && <Skeleton className="h-48 w-full rounded-md mb-4" />}
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
            </CardContent>
            {showActions && (
                <CardFooter className="gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </CardFooter>
            )}
        </>
    );
}

/**
 * Base Skeleton primitive
 *
 * Reusable skeleton element with shimmer animation.
 * Can be used to build custom skeleton layouts.
 *
 * @example
 * <Skeleton className="h-4 w-32" />
 */
export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:400%_100%] rounded",
                className
            )}
            aria-hidden="true"
        />
    );
}

/**
 * Skeleton with pulse animation (alternative style)
 */
export function SkeletonPulse({ className }: { className?: string }) {
    return (
        <div
            className={cn("animate-pulse bg-muted rounded", className)}
            aria-hidden="true"
        />
    );
}

/**
 * Grid layout for skeleton cards
 */
export function SkeletonCardGrid({ count = 6, variant = "default", className }: SkeletonCardProps) {
    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
            <SkeletonCard count={count} variant={variant} />
        </div>
    );
}
