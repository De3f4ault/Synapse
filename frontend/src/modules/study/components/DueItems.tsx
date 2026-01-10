import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  AlertCircle,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDueItems } from "@/api/hooks/useStudy";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/shared/ui";
import { formatDistanceToNow } from "date-fns";
import type { StudyItemResponse } from "@/api/generated";

/**
 * Due Items Component - ENHANCED
 *
 * Display items that need review across all modules with better list display.
 *
 * Enhancements from documentation:
 * - Animated list with stagger effect
 * - Better visual hierarchy
 * - Module filtering
 * - Improved skeleton loading
 * - Priority indicators
 * - Quick actions
 */

interface DueItemsProps {
  modules?: string;
  limit?: number;
  onStartSession?: (items: StudyItemResponse[]) => void;
}

export function DueItems({
  modules = "flashcards,quizzes",
  limit = 20,
  onStartSession,
}: DueItemsProps) {
  const {
    data: items = [],
    isLoading,
    refetch,
    isRefetching,
  } = useDueItems({ modules, limit });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard count={5} variant="compact" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-12 w-12" />}
        title="All Caught Up!"
        description="You have no items due for review right now"
        action={{
          label: "Refresh",
          onClick: () => refetch(),
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Due for Review</h2>
          <p className="text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"} ready to study
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefetching && "animate-spin")}
            />
          </Button>

          {items.length > 0 && onStartSession && (
            <Button onClick={() => onStartSession(items)} size="lg">
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          )}
        </div>
      </div>

      {/* Items List with Stagger Animation */}
      <AnimatePresence mode="popLayout">
        <motion.div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <DueItemCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// Due Item Card Component
interface DueItemCardProps {
  item: StudyItemResponse;
}

function DueItemCard({ item }: DueItemCardProps) {
  const getTypeIcon = (type: string) => {
    if (type === "flashcard") return BookOpen;
    if (type === "quiz") return AlertCircle;
    return Clock;
  };

  const getTypeColor = (type: string) => {
    if (type === "flashcard")
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400";
    if (type === "quiz")
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400";
    return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400";
  };

  const getPriorityLevel = (data: any): "high" | "medium" | "low" => {
    const accuracy = data.accuracy;
    const timesReviewed = data.times_reviewed || 0;

    if (accuracy !== undefined && accuracy < 0.6) return "high";
    if (timesReviewed === 0) return "high";
    if (accuracy !== undefined && accuracy < 0.8) return "medium";
    return "low";
  };

  const getPriorityBadge = (priority: "high" | "medium" | "low") => {
    const colors = {
      high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
      medium:
        "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400",
      low: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400",
    };

    return (
      <Badge variant="outline" className={colors[priority]}>
        {priority} priority
      </Badge>
    );
  };

  // Extract metadata from data object
  const title = item.data.title || item.data.front_text || "Untitled";
  const subtitle = item.data.deck_name || item.data.description || "";
  const nextReview = item.data.next_review;
  const accuracy = item.data.accuracy;
  const priority = getPriorityLevel(item.data);

  const Icon = getTypeIcon(item.type);

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className="hover:shadow-md transition-all border-l-4"
        style={{
          borderLeftColor:
            priority === "high"
              ? "rgb(239, 68, 68)"
              : priority === "medium"
                ? "rgb(234, 179, 8)"
                : "rgb(34, 197, 94)",
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Type Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="mt-1 p-2 rounded-lg bg-muted"
            >
              <Icon className="h-5 w-5" />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium line-clamp-2 leading-tight">
                  {title}
                </h3>
                <div className="flex gap-1 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", getTypeColor(item.type))}
                  >
                    {item.type}
                  </Badge>
                  {getPriorityBadge(priority)}
                </div>
              </div>

              {subtitle && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                  {subtitle}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {nextReview && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      Due{" "}
                      {formatDistanceToNow(new Date(nextReview), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}

                {accuracy !== undefined && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      accuracy >= 0.8
                        ? "bg-green-100 text-green-700"
                        : accuracy >= 0.6
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700",
                    )}
                  >
                    {(accuracy * 100).toFixed(0)}% accuracy
                  </Badge>
                )}

                {item.data.times_reviewed !== undefined && (
                  <span className="text-xs">
                    {item.data.times_reviewed}{" "}
                    {item.data.times_reviewed === 1 ? "review" : "reviews"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
