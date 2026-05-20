/**
 * IngestionProgressBar — Per-file progress bar with phase-appropriate colors
 *
 * Renders a single FileStatus item from useIngestionProgress.
 * Phase colors match Paperless-ngx visual patterns:
 *   STARTED:   gray    (waiting)
 *   UPLOADING: blue    (HTTP upload in progress)
 *   WORKING:   cyan    (backend processing: OCR, thumbnail, etc.)
 *   SUCCESS:   green   (finished)
 *   FAILED:    red     (error)
 *
 * Progress formula (from Paperless websocket-status.service.ts L59-73):
 *   UPLOADING: 0-20% of total bar
 *   WORKING:   20-100% of total bar
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  X,
} from "lucide-react";
import {
  FileStatusPhase,
  getProgress,
  type FileStatus,
} from "../../hooks/useIngestionProgress";

// ============================================================================
// Phase → visual mapping
// ============================================================================

const phaseConfig: Record<FileStatusPhase, {
  icon: typeof Loader2;
  iconClass: string;
  barClass: string;
  spin?: boolean;
}> = {
  [FileStatusPhase.STARTED]: {
    icon: FileText,
    iconClass: "text-muted-foreground",
    barClass: "bg-slate-500",
  },
  [FileStatusPhase.UPLOADING]: {
    icon: Upload,
    iconClass: "text-info",
    barClass: "bg-info",
    spin: false,
  },
  [FileStatusPhase.WORKING]: {
    icon: Loader2,
    iconClass: "text-primary",
    barClass: "bg-primary",
    spin: true,
  },
  [FileStatusPhase.SUCCESS]: {
    icon: CheckCircle2,
    iconClass: "text-accent-olive",
    barClass: "bg-accent-olive",
  },
  [FileStatusPhase.FAILED]: {
    icon: XCircle,
    iconClass: "text-destructive",
    barClass: "bg-destructive",
  },
};

// ============================================================================
// Props
// ============================================================================

interface IngestionProgressBarProps {
  status: FileStatus;
  onDismiss: (taskIdOrFilename: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function IngestionProgressBar({
  status,
  onDismiss,
  className,
}: IngestionProgressBarProps) {
  const config = phaseConfig[status.phase];
  const Icon = config.icon;
  const progress = getProgress(status);
  const progressPercent = Math.round(progress * 100);
  const isComplete = status.phase >= FileStatusPhase.SUCCESS;

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2.5",
        "border-b border-border last:border-b-0",
        "transition-colors hover:bg-muted/50",
        className
      )}
    >
      {/* Phase icon */}
      <Icon
        size={16}
        className={cn(config.iconClass, "shrink-0", config.spin && "animate-spin")}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Filename + percentage */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground/70 font-medium truncate">
            {status.filename || `Task ${status.taskId?.slice(0, 8)}`}
          </span>
          {!isComplete && (
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {progressPercent}%
            </span>
          )}
        </div>

        {/* Status message */}
        {status.message && (
          <p className={cn(
            "text-[11px] truncate",
            status.phase === FileStatusPhase.FAILED ? "text-destructive" : "text-muted-foreground"
          )}>
            {status.message}
          </p>
        )}

        {/* Progress bar (hidden when complete) */}
        {!isComplete && (
          <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", config.barClass)}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Dismiss button (visible on hover for completed, always for failed) */}
      {isComplete && (
        <button
          onClick={() => onDismiss(status.taskId || status.filename)}
          className={cn(
            "p-1 rounded-md transition-colors shrink-0",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            status.phase === FileStatusPhase.FAILED
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          )}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// List wrapper — renders all statuses with "Dismiss completed" button
// ============================================================================

interface IngestionProgressListProps {
  statuses: FileStatus[];
  onDismiss: (taskIdOrFilename: string) => void;
  onDismissCompleted: () => void;
  className?: string;
}

export function IngestionProgressList({
  statuses,
  onDismiss,
  onDismissCompleted,
  className,
}: IngestionProgressListProps) {
  if (statuses.length === 0) return null;

  const completedCount = statuses.filter(
    (s) => s.phase >= FileStatusPhase.SUCCESS
  ).length;

  return (
    <div className={cn("rounded-xl border border-border bg-card/95 backdrop-blur-xl overflow-hidden", className)}>
      {/* Items */}
      {statuses.map((status) => (
        <IngestionProgressBar
          key={status.taskId || status.filename}
          status={status}
          onDismiss={onDismiss}
        />
      ))}

      {/* Footer: dismiss completed */}
      {completedCount > 0 && (
        <div className="px-3 py-1.5 border-t border-border flex justify-end">
          <button
            onClick={onDismissCompleted}
            className="text-[10px] text-muted-foreground hover:text-foreground/80 transition-colors"
          >
            Dismiss {completedCount} completed
          </button>
        </div>
      )}
    </div>
  );
}
