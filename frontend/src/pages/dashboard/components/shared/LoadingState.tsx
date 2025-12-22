import { Skeleton } from "@/components/ui/skeleton";

/**
 * LoadingState - Dark Mode Skeleton
 */
export function LoadingState() {
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[20rem_1fr_20rem] gap-6 p-6">
      {/* Left */}
      <div className="space-y-4">
        <Skeleton className="h-48 w-full bg-white/5 rounded-2xl" />
        <Skeleton className="h-64 w-full bg-white/5 rounded-2xl" />
      </div>

      {/* Center */}
      <div className="h-full bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-cyan-500 animate-spin" />
        </div>
      </div>

      {/* Right */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
      <Skeleton className="h-4 w-24 bg-white/10" />
      <Skeleton className="h-8 w-16 bg-white/10" />
    </div>
  );
}
