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
    iconClass: "text-slate-400",
    barClass: "bg-slate-500",
  },
  [FileStatusPhase.UPLOADING]: {
    icon: Upload,
    iconClass: "text-blue-400",
    barClass: "bg-gradient-to-r from-blue-600 to-blue-400",
    spin: false,
  },
  [FileStatusPhase.WORKING]: {
    icon: Loader2,
    iconClass: "text-cyan-400",
    barClass: "bg-gradient-to-r from-cyan-600 to-cyan-400",
    spin: true,
  },
  [FileStatusPhase.SUCCESS]: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    barClass: "bg-emerald-500",
  },
  [FileStatusPhase.FAILED]: {
    icon: XCircle,
    iconClass: "text-red-400",
    barClass: "bg-red-500",
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
        "border-b border-white/[0.03] last:border-b-0",
        "transition-colors hover:bg-white/[0.02]",
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
          <span className="text-sm text-slate-200 font-medium truncate">
            {status.filename || `Task ${status.taskId?.slice(0, 8)}`}
          </span>
          {!isComplete && (
            <span className="text-xs text-slate-500 font-mono shrink-0">
              {progressPercent}%
            </span>
          )}
        </div>

        {/* Status message */}
        {status.message && (
          <p className={cn(
            "text-[11px] truncate",
            status.phase === FileStatusPhase.FAILED ? "text-red-400" : "text-slate-500"
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
            "text-slate-500 hover:text-white hover:bg-white/10",
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
    <div className={cn("rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl overflow-hidden", className)}>
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
        <div className="px-3 py-1.5 border-t border-white/[0.03] flex justify-end">
          <button
            onClick={onDismissCompleted}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Dismiss {completedCount} completed
          </button>
        </div>
      )}
    </div>
  );
}
