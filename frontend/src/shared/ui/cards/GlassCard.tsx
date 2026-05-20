/**
 * GlassCard → WarmCard - Shared UI Primitive
 *
 * CANONICAL SOURCE - Do not fork.
 *
 * Replaces the glass/blur aesthetic with warm surface styling:
 * - Solid warm background (card token)
 * - Ring-based shadow depth (no backdrop-filter)
 * - Subtle hover: background shift + ring deepening
 * - No noise texture overlay
 */

import React from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends Omit<MotionProps, "children"> {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    elevated?: boolean;
    onClick?: () => void;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ children, className, hover = false, elevated = false, onClick, ...motionProps }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    // Base warm surface
                    "relative overflow-hidden",
                    "bg-card text-card-foreground",
                    "border border-border rounded-lg",

                    // Depth: whisper shadow for elevated cards only
                    elevated && "shadow-whisper",

                    // Interaction
                    hover && [
                        "transition-all duration-200 ease-out",
                        "hover:border-primary/20",
                        "hover:-translate-y-0.5",
                    ],
                    onClick && "cursor-pointer",

                    className
                )}
                onClick={onClick}
                {...motionProps}
            >
                {children}
            </motion.div>
        );
    }
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
