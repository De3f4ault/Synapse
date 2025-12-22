import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string;
    icon: string;
    IconComponent: typeof Info;
  }
> = {
  info: {
    container:
      "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400",
    IconComponent: Info,
  },
  success: {
    container:
      "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-900 dark:text-green-100",
    icon: "text-green-600 dark:text-green-400",
    IconComponent: CheckCircle,
  },
  warning: {
    container:
      "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    IconComponent: AlertCircle,
  },
  error: {
    container:
      "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-900 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400",
    IconComponent: XCircle,
  },
};

/**
 * Alert Component
 *
 * Displays contextual feedback messages with different severity levels.
 * Supports dismissal and custom actions.
 */
export function Alert({
  variant = "info",
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className,
}: AlertProps) {
  const styles = variantStyles[variant];
  const Icon = styles.IconComponent;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex gap-3 rounded-lg border p-4",
        styles.container,
        className,
      )}
      role="alert"
    >
      {/* Icon */}
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", styles.icon)} />

      {/* Content */}
      <div className="flex-1 space-y-1">
        {title && (
          <h4 className="font-semibold text-sm leading-none">{title}</h4>
        )}
        <p className="text-sm leading-relaxed">{message}</p>

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-sm font-medium underline underline-offset-4 hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          onClick={onDismiss}
          className={cn(
            "flex-shrink-0 rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current",
          )}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
