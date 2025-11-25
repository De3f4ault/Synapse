import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    Clock,
    Loader2,
    Sparkles,
    BookOpen,
    RotateCcw,
    Star,
    LucideIcon,
} from "lucide-react";

/**
 * Status types for the badge
 */
export type StatusType =
// Generic statuses
| "success"
| "error"
| "warning"
| "info"
| "pending"
| "processing"
// Processing statuses
| "completed"
| "failed"
// Learning statuses
| "new"
| "learning"
| "review"
| "mastered";

interface StatusBadgeProps {
    status: StatusType;
    size?: "sm" | "md" | "lg";
    showIcon?: boolean;
    pulse?: boolean;
    className?: string;
    children?: React.ReactNode;
}

/**
 * StatusBadge Component
 *
 * Consistent visual representation of status across the app.
 *
 * Features:
 * - Multiple status types (generic, processing, learning)
 * - Size variants (sm, md, lg)
 * - Auto-selected icons based on status
 * - Optional pulse animation for active states
 * - Color-coded backgrounds and text
 * - Custom children for override
 *
 * @example
 * // Generic status
 * <StatusBadge status="success" />
 * <StatusBadge status="error" showIcon />
 *
 * // Processing status
 * <StatusBadge status="processing" pulse />
 *
 * // Learning status
 * <StatusBadge status="mastered" size="lg" />
 *
 * // Custom content
 * <StatusBadge status="warning">
 *   Custom Warning Text
 * </StatusBadge>
 */
export function StatusBadge({
    status,
    size = "md",
    showIcon = true,
    pulse = false,
    className,
    children,
}: StatusBadgeProps) {
    const config = getStatusConfig(status);

    // Size classes
    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
        lg: "text-base px-3 py-1.5",
    };

    const iconSizes = {
        sm: "h-3 w-3",
        md: "h-3.5 w-3.5",
        lg: "h-4 w-4",
    };

    const Icon = showIcon ? config.icon : null;
    const displayText = children || config.label;

    return (
        <Badge
        variant="outline"
        className={cn(
            "inline-flex items-center gap-1.5 font-medium border-0",
            sizeClasses[size],
            config.bgColor,
            config.textColor,
            pulse && config.pulse && "animate-pulse",
            className
        )}
        >
        {Icon && (
            <Icon
            className={cn(
                iconSizes[size],
                status === "processing" && "animate-spin"
            )}
            />
        )}
        {displayText}
        </Badge>
    );
}

/**
 * Get configuration for each status type
 */
function getStatusConfig(status: StatusType): {
    label: string;
    icon: LucideIcon;
    bgColor: string;
    textColor: string;
    pulse?: boolean;
} {
    const configs: Record<StatusType, ReturnType<typeof getStatusConfig>> = {
        // Generic statuses
        success: {
            label: "Success",
            icon: CheckCircle,
            bgColor: "bg-green-500/10",
            textColor: "text-green-700 dark:text-green-400",
        },
        error: {
            label: "Error",
            icon: XCircle,
            bgColor: "bg-red-500/10",
            textColor: "text-red-700 dark:text-red-400",
        },
        warning: {
            label: "Warning",
            icon: AlertCircle,
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-700 dark:text-amber-400",
        },
        info: {
            label: "Info",
            icon: Info,
            bgColor: "bg-blue-500/10",
            textColor: "text-blue-700 dark:text-blue-400",
        },
        pending: {
            label: "Pending",
            icon: Clock,
            bgColor: "bg-slate-500/10",
            textColor: "text-slate-700 dark:text-slate-400",
            pulse: true,
        },
        processing: {
            label: "Processing",
            icon: Loader2,
            bgColor: "bg-slate-500/10",
            textColor: "text-slate-700 dark:text-slate-400",
            pulse: true,
        },

        // Processing statuses
        completed: {
            label: "Completed",
            icon: CheckCircle,
            bgColor: "bg-green-500/10",
            textColor: "text-green-700 dark:text-green-400",
        },
        failed: {
            label: "Failed",
            icon: XCircle,
            bgColor: "bg-red-500/10",
            textColor: "text-red-700 dark:text-red-400",
        },

        // Learning statuses
        new: {
            label: "New",
            icon: Sparkles,
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-700 dark:text-purple-400",
        },
        learning: {
            label: "Learning",
            icon: BookOpen,
            bgColor: "bg-blue-500/10",
            textColor: "text-blue-700 dark:text-blue-400",
        },
        review: {
            label: "Review",
            icon: RotateCcw,
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-700 dark:text-amber-400",
        },
        mastered: {
            label: "Mastered",
            icon: Star,
            bgColor: "bg-green-500/10",
            textColor: "text-green-700 dark:text-green-400",
        },
    };

    return configs[status];
}

/**
 * Status Dot Component
 *
 * Minimal dot indicator for inline status display
 */
export function StatusDot({
    status,
    size = "md",
    pulse = false,
    className,
}: {
    status: StatusType;
    size?: "sm" | "md" | "lg";
    pulse?: boolean;
    className?: string;
}) {
    const config = getStatusConfig(status);

    const sizeClasses = {
        sm: "h-2 w-2",
        md: "h-2.5 w-2.5",
        lg: "h-3 w-3",
    };

    return (
        <div
        className={cn(
            "rounded-full",
            sizeClasses[size],
            config.bgColor.replace("/10", ""),
                      pulse && config.pulse && "animate-pulse",
                      className
        )}
        aria-label={config.label}
        />
    );
}
