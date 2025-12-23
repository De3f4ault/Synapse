/**
 * GlassCard - "Synapse" Base Component
 * * Features:
 * - Specific backdrop blur and noise texture for the sci-fi look
 * - Neon border glow on hover
 * - Standardized rounded corners and padding
 */

import React from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends Omit<MotionProps, "children"> {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ children, className, hover = false, onClick, ...motionProps }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    "synapse-panel", // Base Synapse Panel style
                    "relative overflow-hidden", // Ensure content/overlays are contained

                    // Interaction
                    hover && [
                        "transition-all duration-300",
                        "hover:bg-white/5 hover:border-white/20",
                        "hover:shadow-xl hover:-translate-y-1",
                    ],
                    onClick && "cursor-pointer",

                    className
                )}
                onClick={onClick}
                {...motionProps}
            >
                {/* Noise Texture Overlay (Optional, adds grit) */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0 mix-blend-overlay" />

                {/* Content */}
                <div className="relative z-10 h-full">{children}</div>
            </motion.div>
        );
    }
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
