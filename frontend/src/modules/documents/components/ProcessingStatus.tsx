import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2, Clock, RefreshCw } from "lucide-react";
import type { ProcessingStatus as ProcessingStatusType } from "@/api/generated";

/**
 * Enhanced ProcessingStatus Component
 *
 * Improvements per documentation:
 * - Animated progress indicators
 * - Better visual feedback
 * - Smooth state transitions
 * - Enhanced status icons with animations
 * - Retry functionality with feedback
 */

interface ProcessingStatusProps {
  status: ProcessingStatusType;
  progress: number;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  ProcessingStatusType,
  {
    icon: React.ReactNode;
    label: string;
    color: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    label: "Pending",
    color: "text-muted-foreground",
    badgeVariant: "secondary",
  },
  processing: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "Processing",
    color: "text-blue-500",
    badgeVariant: "default",
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Completed",
    color: "text-green-500",
    badgeVariant: "outline",
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Failed",
    color: "text-destructive",
    badgeVariant: "destructive",
  },
};

export function ProcessingStatus({
  status,
  progress,
  message,
  onRetry,
  className,
}: ProcessingStatusProps) {
  const config = STATUS_CONFIG[status];

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
              status === "processing"
                ? { rotate: 360 }
                : status === "completed"
                  ? { scale: [1, 1.2, 1] }
                  : {}
            }
            transition={
              status === "processing"
                ? { duration: 2, repeat: Infinity, ease: "linear" }
                : { duration: 0.3 }
            }
          >
            {config.icon}
          </motion.span>
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
        </div>
        {status === "processing" && (
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

      {(status === "pending" || status === "processing") && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
          style={{ transformOrigin: "left" }}
        >
          <Progress value={progress} className="h-2" />
        </motion.div>
      )}

      {message && (
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {message}
        </motion.p>
      )}

      {status === "failed" && onRetry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
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
          className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Document ready for use</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Compact inline status indicator with animation.
 */
interface StatusBadgeProps {
  status: ProcessingStatusType;
  className?: string;
}

export function ProcessingStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Badge variant={config.badgeVariant} className={cn("gap-1", className)}>
        <motion.span
          animate={
            status === "processing"
              ? { rotate: 360 }
              : status === "completed"
                ? { scale: [1, 1.1, 1] }
                : {}
          }
          transition={
            status === "processing"
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
