import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

/**
 * StatCard Component
 *
 * Animated statistics card with:
 * - Number counting animation (0 → final value)
 * - Trend indicators (up/down with percentage)
 * - Color-coded icons and accents
 * - Hover effects (scale + shadow)
 * - Optional click action
 * - Loading skeleton state
 */

interface TrendData {
  value: number; // Percentage change (e.g., 15 for +15%)
  label: string; // e.g., "vs last week"
  direction: "up" | "down";
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: TrendData;
  onClick?: () => void;
  loading?: boolean;
  suffix?: string; // e.g., "%", "min", "cards"
  prefix?: string; // e.g., "$"
  decimals?: number; // Number of decimal places
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  trend,
  onClick,
  loading = false,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: StatCardProps) {
  // Animated counter
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return `${prefix}${latest.toFixed(decimals)}${suffix}`;
  });

  // Animate counter on mount or value change
  useEffect(() => {
    if (loading) return;

    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
    const controls = animate(count, numValue, {
      duration: 1,
      ease: "easeOut",
    });

    return controls.stop;
  }, [value, loading, count]);

  // Loading state
  if (loading) {
    return (
      <Card className={cn("hover:shadow-lg transition-shadow", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "hover:shadow-lg transition-shadow",
          onClick && "cursor-pointer",
          className,
        )}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.2,
              type: "spring",
              stiffness: 200,
            }}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.div
            className="text-3xl font-bold mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {rounded}
          </motion.div>

          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className={cn(
                "flex items-center text-xs",
                trend.direction === "up"
                  ? "text-green-600 dark:text-green-500"
                  : "text-red-600 dark:text-red-500",
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span className="font-semibold">{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground ml-1">{trend.label}</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * StatCardSkeleton
 * Standalone skeleton for loading state
 */
export function StatCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
