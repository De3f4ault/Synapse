/**
 * Shared UI - Loading State
 *
 * INVARIANT: This is the ONE loading component for the entire system.
 * INVARIANT: Modules may wrap this, but NEVER fork it.
 *
 * Use this for:
 * - API data fetching
 * - File processing
 * - Graph computation
 * - Any async operation
 */

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// ============================================================================
// Types
// ============================================================================

export type LoadingVariant = "spinner" | "dots" | "pulse";
export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LoadingStateProps {
    /** Additional CSS classes */
    className?: string;

    /** Size variant */
    size?: LoadingSize;

    /** Visual variant */
    variant?: LoadingVariant;

    /** Loading text to display */
    text?: string;

    /** Display as full-screen overlay */
    fullScreen?: boolean;

    /** Center in parent container */
    centered?: boolean;
}

// ============================================================================
// Size Mappings
// ============================================================================

const sizeClasses: Record<LoadingSize, string> = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
};

const textSizeClasses: Record<LoadingSize, string> = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
};

const dotSizes: Record<LoadingSize, string> = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
    xl: "h-5 w-5",
};

// ============================================================================
// Sub-Components
// ============================================================================

function DotsSpinner({ size = "md" }: { size?: LoadingSize }) {
    const dotSize = dotSizes[size];

    const dotVariants = {
        initial: { y: 0 },
        animate: {
            y: [-8, 0, -8],
            transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
        },
    };

    return (
        <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
                <motion.div
                    key={index}
                    className={cn("rounded-full bg-primary", dotSize)}
                    variants={dotVariants}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: index * 0.15 }}
                />
            ))}
        </div>
    );
}

function PulseSpinner({ size = "md" }: { size?: LoadingSize }) {
    const pulseSize = sizeClasses[size];

    return (
        <div className="relative" aria-hidden="true">
            <motion.div
                className={cn("rounded-full bg-primary", pulseSize)}
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className={cn("absolute inset-0 rounded-full bg-primary", pulseSize)}
                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3,
                }}
            />
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LoadingState Component
 *
 * The canonical loading indicator for the entire application.
 *
 * @example
 * // Basic spinner
 * <LoadingState size="md" />
 *
 * // With text
 * <LoadingState text="Loading decks..." />
 *
 * // Full screen overlay
 * <LoadingState fullScreen text="Processing document..." />
 *
 * // Dots variant
 * <LoadingState variant="dots" />
 */
export function LoadingState({
    className,
    size = "md",
    variant = "spinner",
    text,
    fullScreen = false,
    centered = false,
}: LoadingStateProps) {
    // Render spinner based on variant
    const renderSpinner = () => {
        if (variant === "dots") {
            return <DotsSpinner size={size} />;
        }

        if (variant === "pulse") {
            return <PulseSpinner size={size} />;
        }

        // Default spinner (rotating circle)
        return (
            <Loader2
                className={cn("animate-spin text-primary", sizeClasses[size], className)}
                aria-hidden="true"
            />
        );
    };

    const content = (
        <div
            className="flex flex-col items-center justify-center gap-3"
            role="status"
            aria-live="polite"
            aria-label={text || "Loading"}
        >
            {renderSpinner()}
            {text && (
                <p
                    className={cn(
                        "font-medium text-muted-foreground",
                        textSizeClasses[size]
                    )}
                >
                    {text}
                </p>
            )}
            <span className="sr-only">{text || "Loading..."}</span>
        </div>
    );

    // Full-screen overlay mode
    if (fullScreen) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
                {content}
            </motion.div>
        );
    }

    // Centered mode
    if (centered) {
        return (
            <div className="flex items-center justify-center py-12">{content}</div>
        );
    }

    return content;
}

/**
 * Convenience component for centered loading
 * @deprecated Use <LoadingState centered /> instead
 */
export function CenteredLoadingSpinner(
    props: Omit<LoadingStateProps, "fullScreen" | "centered">
) {
    return <LoadingState {...props} centered />;
}
