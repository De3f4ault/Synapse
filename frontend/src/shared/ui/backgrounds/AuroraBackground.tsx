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
import { useAudioSignals } from "@/platform/audio/hooks/useAudioSignals";

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

    /** Audio Reactivity Signals (Optional) */
    audioReactivity?: {
        energy: number;
        bass: number;
        treble: number;
    } | null;
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
        primary: "bg-accent/20",
        secondary: "bg-primary/20",
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
        secondary: "bg-muted",
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
    audioReactivity: propReactivity,
}: AuroraBackgroundProps) {
    const config = variantConfigs[variant];
    
    // Auto-wire signals if not passed expicitly
    const hookSignals = useAudioSignals();
    const audioReactivity = propReactivity || hookSignals;

    // Opacity multiplier based on intensity
    const baseOpacity = 0.3 * intensity;
    const secondaryOpacity = 0.2 * intensity;

    // Reactivity overrides
    const isReactive = !!audioReactivity;
    
    // Primary (Bass/Energy)
    // Scale: 1 + bass*0.3 (pulses size)
    // Opacity: base + energy*0.3 (pulses brightness)
    const primaryAnimate = isReactive ? {
        scale: 1 + (audioReactivity.bass * 0.3),
        opacity: baseOpacity + (audioReactivity.energy * 0.3),
        x: 0, // Reset movement to focus on pulse
    } : {
        scale: [1, 1.2, 1],
        opacity: [baseOpacity, baseOpacity + 0.1, baseOpacity],
        x: [0, 50, 0],
    };

    const primaryTransition = isReactive ? {
        type: "tween", ease: "linear", duration: 0.1
    } : {
        duration: 15,
        repeat: Infinity,
        ease: "easeInOut",
    };

    // Secondary (Treble/Energy)
    // Scale: 1 + treble*0.2
    // Opacity: secondary + treble*0.2
    const secondaryAnimate = isReactive ? {
        scale: 1 + (audioReactivity.treble * 0.25),
        opacity: secondaryOpacity + (audioReactivity.treble * 0.2),
        x: 0,
    } : {
        scale: [1, 1.3, 1],
        opacity: [secondaryOpacity, secondaryOpacity + 0.1, secondaryOpacity],
        x: [0, -50, 0],
    };

    const secondaryTransition = isReactive ? {
        type: "tween", ease: "linear", duration: 0.1
    } : {
        duration: 20,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 2,
    };

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden bg-background text-foreground/70",
                fixed && "h-screen",
                className
            )}
        >
            {/* Ambient Gradients */}

            {/* Top Left - Primary Glow */}
            <motion.div
                animate={primaryAnimate}
                transition={primaryTransition}
                className={cn(
                    "absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[128px]",
                    config.primary
                )}
            />

            {/* Bottom Right - Secondary Glow */}
            <motion.div
                animate={secondaryAnimate}
                transition={secondaryTransition}
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
            <div className="relative z-10 w-full flex-1 flex flex-col">
                {children}
            </div>
        </div>
    );
}
