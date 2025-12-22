/**
 * PriorityBadge - Visual indicator for priority level
 * Consistent badge styling for priority queue items
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PriorityLevel } from "../../types/dashboard.types";

interface PriorityBadgeProps {
  priority: number; // 0-1 score
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function PriorityBadge({
  priority,
  size = "sm",
  showLabel = true,
}: PriorityBadgeProps) {
  const level = getPriorityLevel(priority);
  const color = getPriorityColor(level);

  const sizeClasses = {
    sm: "text-[9px] h-4 px-1.5",
    md: "text-xs h-5 px-2",
    lg: "text-sm h-6 px-3",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "uppercase font-bold tracking-wider",
        color,
        sizeClasses[size],
      )}
    >
      {showLabel ? level : `${Math.round(priority * 100)}%`}
    </Badge>
  );
}

function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 0.8) return "urgent";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function getPriorityColor(level: PriorityLevel): string {
  switch (level) {
    case "urgent":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "low":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}
