import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for dashboard
 * Mimics the three-column layout structure
 */
export function LoadingState() {
    return (
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Intelligence */}
        <div className="lg:col-span-3 space-y-4">
        <Card>
        <CardHeader>
        <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        </CardContent>
        </Card>
        </div>

        {/* Center Panel - Graph */}
        <div className="lg:col-span-6">
        <Card className="h-full">
        <CardHeader>
        <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="h-[600px] flex items-center justify-center">
        <div className="space-y-4 text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        </CardContent>
        </Card>
        </div>

        {/* Right Panel - Queue */}
        <div className="lg:col-span-3 space-y-4">
        <Card>
        <CardHeader>
        <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
        ))}
        </CardContent>
        </Card>
        </div>
        </div>
    );
}

/**
 * Loading skeleton for individual cards
 */
export function CardLoadingSkeleton() {
    return (
        <Card>
        <CardHeader>
        <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-24 mt-2" />
        </CardContent>
        </Card>
    );
}
