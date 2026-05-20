/**
 * TaskProgressPanel — Active task list with progress bars
 *
 * Shows running document ingestion tasks, completed tasks,
 * and failed tasks. Triggered from the notification area.
 */

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { TaskEvent } from "../../hooks/useTaskProgress";

// ============================================================================
// Props
// ============================================================================

interface TaskProgressPanelProps {
  activeTasks: TaskEvent[];
  completedTasks: TaskEvent[];
  failedTasks: TaskEvent[];
  connected: boolean;
  onClear: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TaskProgressPanel({
  activeTasks,
  completedTasks,
  failedTasks,
  connected,
  onClear,
  className,
}: TaskProgressPanelProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const totalTasks = activeTasks.length + completedTasks.length + failedTasks.length;

  if (totalTasks === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-border bg-card/95 backdrop-blur-xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Tasks
          </h3>
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-accent-olive" : "bg-destructive"
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {connected ? "Live" : "Disconnected"}
            </span>
          </span>
        </div>
        {totalTasks > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            <Trash2 size={11} className="mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active tasks */}
      <AnimatePresence>
        {activeTasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border"
          >
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-primary animate-spin shrink-0" />
                <span className="text-sm text-foreground/70 font-medium truncate flex-1">
                  {task.documentTitle || `Document #${task.documentId}`}
                </span>
                {task.progress !== undefined && (
                  <span className="text-xs text-primary/80 font-mono shrink-0">
                    {Math.round(task.progress)}%
                  </span>
                )}
              </div>
              {task.currentStep && (
                <p className="text-[11px] text-muted-foreground pl-5">{task.currentStep}</p>
              )}
              {task.progress !== undefined && (
                <div className="h-1 rounded-full bg-foreground/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Failed tasks */}
      {failedTasks.map((task) => (
        <div
          key={task.id}
          className="px-4 py-2.5 border-b border-border flex items-center gap-2"
        >
          <XCircle size={14} className="text-destructive shrink-0" />
          <span className="text-sm text-red-300 truncate flex-1">
            {task.documentTitle || `Document #${task.documentId}`}
          </span>
          <span className="text-[10px] text-destructive/60 shrink-0">failed</span>
        </div>
      ))}

      {/* Completed tasks (collapsible) */}
      {completedTasks.length > 0 && (
        <>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground/80 hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-accent-olive" />
              {completedTasks.length} completed
            </span>
            {showCompleted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-4 py-2 border-b border-border flex items-center gap-2"
                  >
                    <FileText size={12} className="text-accent-olive/50 shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {task.documentTitle || `Document #${task.documentId}`}
                    </span>
                    <CheckCircle2 size={10} className="text-accent-olive/40 shrink-0" />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
