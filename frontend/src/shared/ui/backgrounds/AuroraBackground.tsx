/**
 * Shared UI - Aurora Background
 *
 * INVARIANT: This is the ONE ambient background for focus/zen modes.
 * INVARIANT: Modules may wrap this, but NEVER fork it.
 *
 * Use this for:
 * - Study modes (flashcards, quizzes)
 * - Focus sessions
 * - Zen/distraction-free views
 * - Graph visualization backgrounds
 */

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type AuroraVariant = "default" | "warm" | "cool" | "minimal";

export interface AuroraBackgroundProps {
    /** Content to render on top of the aurora */
    children: React.ReactNode;

    /** Color variant */
    variant?: AuroraVariant;

    /** Fixed full-screen or contained */
    fixed?: boolean;

    /** Additional CSS classes for the container */
    className?: string;

    /** Intensity of the glow (0-1) */
    intensity?: number;
}

// ============================================================================
// Variant Configurations
// ============================================================================

interface GlowConfig {
    primary: string;
    secondary: string;
    tertiary: string;
}

const variantConfigs: Record<AuroraVariant, GlowConfig> = {
    default: {
        primary: "bg-purple-900",
        secondary: "bg-cyan-900",
        tertiary: "bg-blue-900/10",
    },
    warm: {
        primary: "bg-orange-900",
        secondary: "bg-rose-900",
        tertiary: "bg-amber-900/10",
    },
    cool: {
        primary: "bg-blue-900",
        secondary: "bg-teal-900",
        tertiary: "bg-indigo-900/10",
    },
    minimal: {
        primary: "bg-slate-800",
        secondary: "bg-slate-700",
        tertiary: "bg-slate-800/5",
    },
};

// ============================================================================
// Component
// ============================================================================

/**
 * AuroraBackground Component
 *
 * Creates a deep, dark ambient background with subtle moving gradients.
 * Designed for "Zen" study mode to reduce eye strain and increase focus.
 *
 * Colors:
 * - Base: #050505 (Deep Void)
 * - Accent 1: Purple/Violet (Creativity/Mystery)
 * - Accent 2: Emerald/Cyan (Focus/Calm)
 *
 * @example
 * <AuroraBackground>
 *   <StudyContent />
 * </AuroraBackground>
 *
 * @example
 * <AuroraBackground variant="warm" intensity={0.5}>
 *   <QuizContent />
 * </AuroraBackground>
 */
export function AuroraBackground({
    children,
    variant = "default",
    fixed = true,
    className,
    intensity = 1,
}: AuroraBackgroundProps) {
    const config = variantConfigs[variant];

    // Opacity multiplier based on intensity
    const baseOpacity = 0.3 * intensity;
    const secondaryOpacity = 0.2 * intensity;

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden bg-[#050505] text-slate-200",
                fixed && "h-screen",
                className
            )}
        >
            {/* Ambient Gradients */}

            {/* Top Left - Primary Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [baseOpacity, baseOpacity + 0.1, baseOpacity],
                    x: [0, 50, 0],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={cn(
                    "absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[128px]",
                    config.primary
                )}
            />

            {/* Bottom Right - Secondary Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [secondaryOpacity, secondaryOpacity + 0.1, secondaryOpacity],
                    x: [0, -50, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                }}
                className={cn(
                    "absolute -bottom-48 -right-48 w-[800px] h-[800px] rounded-full blur-[128px]",
                    config.secondary
                )}
            />

            {/* Mid Right - Tertiary (Static) */}
            <div
                className={cn(
                    "absolute top-1/3 -right-64 w-[500px] h-[500px] rounded-full blur-[96px]",
                    config.tertiary
                )}
            />

            {/* Content Layer - Z-index ensures content is above glow */}
            <div className="relative z-10 w-full h-full flex flex-col">
                {children}
            </div>
        </div>
    );
}
