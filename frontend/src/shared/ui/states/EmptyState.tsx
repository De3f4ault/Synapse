/**
 * Shared UI - Empty State
 *
 * INVARIANT: This is the ONE empty state component for the entire system.
 * INVARIANT: Modules may wrap this, but NEVER fork it.
 *
 * Use this for:
 * - No data yet (first-time user)
 * - No search results
 * - Empty lists after filtering
 * - Graph nodes with no connections
 */

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type EmptyStateVariant =
    | "default"
    | "no-data"
    | "no-results"
    | "error"
    | "coming-soon";

export interface EmptyStateAction {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
}

export interface EmptyStateProps {
    /** Icon to display (React node or Lucide icon) */
    icon?: React.ReactNode | LucideIcon;

    /** Main title */
    title: string;

    /** Description text */
    description?: string;

    /** Primary action button */
    action?: EmptyStateAction;

    /** Secondary action button */
    secondaryAction?: EmptyStateAction;

    /** Visual variant */
    variant?: EmptyStateVariant;

    /** Additional CSS classes */
    className?: string;

    /** Size variant */
    size?: "sm" | "md" | "lg";
}

// ============================================================================
// Component
// ============================================================================

/**
 * EmptyState Component
 *
 * The canonical empty state for the entire application.
 * Features animated icon with subtle float effect.
 *
 * @example
 * <EmptyState
 *   icon={<FileText className="h-12 w-12" />}
 *   title="No decks yet"
 *   description="Create your first deck to start learning"
 *   action={{ label: "Create Deck", onClick: handleCreate }}
 * />
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    secondaryAction,
    variant = "default",
    className,
    size = "md",
}: EmptyStateProps) {
    // Variant-specific styling
    const variantStyles: Record<EmptyStateVariant, string> = {
        default: "text-muted-foreground",
        "no-data": "text-muted-foreground",
        "no-results": "text-muted-foreground",
        error: "text-destructive",
        "coming-soon": "text-primary",
    };

    // Size-specific styling
    const sizeStyles = {
        sm: { padding: "py-8", iconSize: "h-8 w-8", titleSize: "text-base" },
        md: { padding: "py-12", iconSize: "h-12 w-12", titleSize: "text-lg" },
        lg: { padding: "py-16", iconSize: "h-16 w-16", titleSize: "text-xl" },
    };

    const currentSize = sizeStyles[size];

    // Animation variants
    const iconVariants = {
        initial: { opacity: 0, y: 20 },
        animate: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" },
        },
        float: {
            y: [0, -8, 0],
            transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        },
    };

    const contentVariants = {
        initial: { opacity: 0, y: 10 },
        animate: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, delay: 0.2, ease: "easeOut" },
        },
    };

    // Render icon (handles both ReactNode and LucideIcon)
    const renderIcon = () => {
        if (!icon) return null;

        // If it's a Lucide icon component
        if (typeof icon === "function") {
            const IconComponent = icon as LucideIcon;
            return <IconComponent className={currentSize.iconSize} />;
        }

        // It's already a ReactNode
        return icon;
    };

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center px-4 text-center",
                currentSize.padding,
                className
            )}
            role="status"
            aria-live="polite"
        >
            {icon && (
                <motion.div
                    className={cn("mb-4", variantStyles[variant])}
                    variants={iconVariants}
                    initial="initial"
                    animate={["animate", "float"]}
                    aria-hidden="true"
                >
                    {renderIcon()}
                </motion.div>
            )}

            <motion.div
                variants={contentVariants}
                initial="initial"
                animate="animate"
                className="max-w-md"
            >
                <h3
                    className={cn(
                        "mb-2 font-semibold text-foreground",
                        currentSize.titleSize
                    )}
                >
                    {title}
                </h3>

                {description && (
                    <p className="mb-6 text-sm text-muted-foreground">{description}</p>
                )}

                {(action || secondaryAction) && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {action && (
                            <Button
                                onClick={action.onClick}
                                variant={action.variant}
                                size="default"
                            >
                                {action.label}
                            </Button>
                        )}
                        {secondaryAction && (
                            <Button
                                onClick={secondaryAction.onClick}
                                variant={secondaryAction.variant ?? "outline"}
                                size="default"
                            >
                                {secondaryAction.label}
                            </Button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
