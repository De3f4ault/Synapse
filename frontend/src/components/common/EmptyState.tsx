import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    variant?: "default" | "no-data" | "no-results" | "error" | "coming-soon";
    className?: string;
}

/**
 * EmptyState Component
 *
 * Enhanced empty state with:
 * - Multiple variants for different contexts
 * - Animated icon with subtle float effect
 * - Primary and secondary actions
 * - Responsive layout
 * - Accessibility support
 *
 * @example
 * <EmptyState
 *   icon={<FileText className="h-12 w-12" />}
 *   title="No decks yet"
 *   description="Create your first deck to start learning"
 *   action={{ label: "Create Deck", onClick: handleCreate }}
 *   variant="no-data"
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
}: EmptyStateProps) {
    // Variant-specific styling
    const variantStyles = {
        default: "text-muted-foreground",
            "no-data": "text-muted-foreground",
            "no-results": "text-muted-foreground",
            error: "text-destructive",
            "coming-soon": "text-primary",
    };

    // Animation variants for icon
    const iconVariants = {
        initial: { opacity: 0, y: 20 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut",
            },
        },
        float: {
            y: [0, -8, 0],
            transition: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
    };

    // Animation variants for content
    const contentVariants = {
        initial: { opacity: 0, y: 10 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                delay: 0.2,
                ease: "easeOut",
            },
        },
    };

    return (
        <div
        className={cn(
            "flex flex-col items-center justify-center py-12 px-4 text-center",
            className
        )}
        role="status"
        aria-live="polite"
        >
        {icon && (
            <motion.div
            className={cn(
                "mb-4",
                variantStyles[variant]
            )}
            variants={iconVariants}
            initial="initial"
            animate={["animate", "float"]}
            aria-hidden="true"
            >
            {icon}
            </motion.div>
        )}

        <motion.div
        variants={contentVariants}
        initial="initial"
        animate="animate"
        className="max-w-md"
        >
        <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title}
        </h3>

        {description && (
            <p className="mb-6 text-sm text-muted-foreground">
            {description}
            </p>
        )}

        {(action || secondaryAction) && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {action && (
                <Button
                onClick={action.onClick}
                size="default"
                >
                {action.label}
                </Button>
            )}
            {secondaryAction && (
                <Button
                onClick={secondaryAction.onClick}
                variant="outline"
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
