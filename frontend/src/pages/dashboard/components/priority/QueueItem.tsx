import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight, Calendar, MoreVertical } from "lucide-react";
import { cn, formatStudyTime } from "@/lib/utils";
import { formatDueDate } from "../../utils/dateFormatters";
import type { QueueItem as QueueItemType } from "../../types/queue.types";
import { ModuleBadge } from "../shared/ModuleBadge";
import { PriorityBadge } from "../shared/PriorityBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QueueItemProps {
  item: QueueItemType;
  sectionColor: string;
  onClick?: () => void;
  onDismiss?: () => void;
  onSnooze?: (hours: number) => void;
}

/**
 * QueueItem - "Tactical Card" Style
 * Dark, bordered, with neon accents representing priority.
 */
export function QueueItem({
  item,
  sectionColor,
  onClick,
  onDismiss,
  onSnooze,
}: QueueItemProps) {
  // Map section color to neon palette
  const accentColor =
    sectionColor === "red"
      ? "border-red-500/50"
      : sectionColor === "orange"
        ? "border-orange-500/50"
        : sectionColor === "blue"
          ? "border-blue-500/50"
          : "border-slate-500/50";

  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.99 }}
      className="group relative"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-[#111] border border-white/5 hover:bg-[#161616] hover:border-white/10 transition-all cursor-pointer p-3",
          "border-l-[3px]",
          accentColor,
        )}
        onClick={onClick || (() => (window.location.href = item.actionUrl))}
      >
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between">
              <h4 className="font-bold text-xs text-slate-200 group-hover:text-white truncate pr-2">
                {item.title}
              </h4>
              <ModuleBadge
                type={item.moduleType}
                showIcon={false}
                className="opacity-80 scale-90 origin-right"
              />
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
              {item.dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-1",
                    isDueToday(item.dueDate) && "text-red-400 font-bold",
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {formatDueDate(item.dueDate)}
                </div>
              )}
              {item.estimatedMinutes && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatStudyTime(item.estimatedMinutes)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 items-end">
            <PriorityBadge
              priority={item.priority}
              showIcon={false}
              className="scale-75 origin-right"
            />

            <div className="flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#0A0A0A] border-white/10 text-slate-300"
                >
                  <DropdownMenuItem onClick={() => onSnooze?.(1)}>
                    Snooze 1h
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSnooze?.(24)}>
                    Snooze 1d
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDismiss}
                    className="text-red-400 focus:text-red-300"
                  >
                    Dismiss
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ChevronRight className="h-3 w-3 text-slate-500 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function isDueToday(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  return due.toDateString() === today.toDateString();
}
