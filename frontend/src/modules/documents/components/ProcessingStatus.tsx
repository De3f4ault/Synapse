import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  ScanText,
  Database,
} from "lucide-react";
import type { ProcessingStatus as ProcessingStatusType } from "@/api/generated";

/**
 * ProcessingStatus Component
 *
 * Covers the full 6-state two-pipeline document lifecycle:
 *   DMS:  pending → parsing → parsed
 *   RAG:  parsed  → chunking → completed
 *
 * Animates correctly for each in-progress state.
 */

interface ProcessingStatusProps {
  status: ProcessingStatusType;
  progress: number;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

// Helper: which statuses are "in progress" (show progress bar + spinner)
const IN_PROGRESS = new Set(["pending", "parsing", "parsed", "chunking"]);
// Helper: which statuses show spinning animation
const SPINNING = new Set(["parsing", "chunking"]);

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    label: string;
    color: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
    description: string;
  }
> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    label: "Queued",
    color: "text-muted-foreground",
    badgeVariant: "secondary",
    description: "Waiting to be processed",
  },
  parsing: {
    icon: <ScanText className="h-4 w-4" />,
    label: "Parsing",
    color: "text-blue-500",
    badgeVariant: "default",
    description: "Extracting text and metadata",
  },
  parsed: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "Indexing",
    color: "text-violet-500",
    badgeVariant: "default",
    description: "Text ready — building knowledge base",
  },
  chunking: {
    icon: <Database className="h-4 w-4" />,
    label: "Embedding",
    color: "text-amber-500",
    badgeVariant: "default",
    description: "Embedding into knowledge base",
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Ready",
    color: "text-accent-olive",
    badgeVariant: "outline",
    description: "Fully searchable",
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Failed",
    color: "text-destructive",
    badgeVariant: "destructive",
    description: "Processing failed",
  },
};

export function ProcessingStatus({
  status,
  progress,
  message,
  onRetry,
  className,
}: ProcessingStatusProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"];
  const isInProgress = IN_PROGRESS.has(status);
  const isSpinning = SPINNING.has(status);

  return (
    <motion.div
      className={cn("space-y-2", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span
            className={config.color}
            animate={
              isSpinning
                ? { rotate: 360 }
                : status === "completed"
                  ? { scale: [1, 1.2, 1] }
                  : {}
            }
            transition={
              isSpinning
                ? { duration: 2, repeat: Infinity, ease: "linear" }
                : { duration: 0.3 }
            }
          >
            {config.icon}
          </motion.span>
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
        </div>
        {isInProgress && progress > 0 && (
          <motion.span
            className="text-sm font-medium text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {Math.round(progress)}%
          </motion.span>
        )}
      </div>

      {isInProgress && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
          style={{ transformOrigin: "left" }}
        >
          <Progress value={progress} className="h-2" />
        </motion.div>
      )}

      {(message || config.description) && (
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {message ?? config.description}
        </motion.p>
      )}

      {status === "failed" && onRetry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Processing
          </Button>
        </motion.div>
      )}

      {status === "completed" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex items-center gap-2 text-sm text-green-600 dark:text-accent-olive"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Document ready for use</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Compact inline status badge with animation.
 * Safe fallback for unknown status values.
 */
interface StatusBadgeProps {
  status: ProcessingStatusType;
  className?: string;
}

export function ProcessingStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"];
  const isSpinning = SPINNING.has(status);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Badge variant={config.badgeVariant} className={cn("gap-1", className)}>
        <motion.span
          animate={
            isSpinning
              ? { rotate: 360 }
              : status === "completed"
                ? { scale: [1, 1.1, 1] }
                : {}
          }
          transition={
            isSpinning
              ? { duration: 2, repeat: Infinity, ease: "linear" }
              : { duration: 0.3 }
          }
        >
          {config.icon}
        </motion.span>
        {config.label}
      </Badge>
    </motion.div>
  );
}

export default ProcessingStatus;
