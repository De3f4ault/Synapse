/**
 * ItemCard - Display component for study items
 */

import { Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { StudyItem } from "../../types/study.types";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: StudyItem;
  onClick?: () => void;
  selected?: boolean;
}

export function ItemCard({ item, onClick, selected }: ItemCardProps) {
  const isOverdue = item.priority === "high";
  const isNew = item.priority === "new";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <div
        onClick={onClick}
        className={cn(
          "cursor-pointer h-full relative p-6 rounded-xl flex flex-col transition-all duration-300",
          // Base styles
          "bg-card border border-border shadow-lg",
          // Hover styles
          "hover:border-primary/30 hover:shadow-cyan-500/10",
          // Selected styles
          selected
            ? "border-primary bg-cyan-950/10  ring-1 ring-cyan-500/50"
            : "",
        )}
      >
        {/* Selection Indicator */}
        {selected && (
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        )}

        <div className="space-y-4 flex-1">
          {/* Header with title - simplified, no type badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {/* Priority indicator - subtle colored dot */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isOverdue ? "bg-destructive animate-pulse" :
                      isNew ? "bg-accent-olive" :
                        "bg-slate-500"
                  )}
                />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {isOverdue ? "Overdue" : isNew ? "New" : item.type}
                </span>
              </div>
              <h4 className="font-bold text-foreground text-base line-clamp-2 leading-snug">
                {item.title}
              </h4>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-mono text-muted-foreground">
            {item.estimatedTime && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-primary/70" />
                {item.estimatedTime}m
              </div>
            )}
            {typeof item.masteryLevel === "number" && (
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} className="text-primary/70" />
                {item.masteryLevel}% mastery
              </div>
            )}
            {item.difficulty && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                {getDifficultyLabel(item.difficulty)}
              </div>
            )}
          </div>
        </div>

        {/* Footer / Progress */}
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {/* Mastery Progress Bar */}
          {typeof item.masteryLevel === "number" && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                <span>Mastery</span>
                <span>{item.masteryLevel}%</span>
              </div>
              <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    getMasteryColor(item.masteryLevel),
                  )}
                  style={{ width: `${item.masteryLevel}%` }}
                />
              </div>
            </div>
          )}

          {/* Due date info */}
          {item.dueDate && (
            <p className="text-[10px] text-right font-mono text-muted-foreground">
              {isOverdue ? "Was due" : "Due"}{" "}
              <span className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                {formatDueDate(item.dueDate)}
              </span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getDifficultyLabel(difficulty: number): string {
  const labels: Record<number, string> = {
    1: "Very Easy",
    2: "Easy",
    3: "Medium",
    4: "Hard",
    5: "Very Hard",
  };
  return labels[difficulty] || "Medium";
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 80) return "bg-accent-olive";
  if (mastery >= 60) return "bg-blue-500";
  if (mastery >= 40) return "bg-yellow-500";
  return "bg-destructive";
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 0) return "today";
    if (absDays === 1) return "yesterday";
    return `${absDays}d ago`;
  }

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays}d`;
  return date.toLocaleDateString();
}
