/**
 * AudioVisualizer - Simple glassy audio visualizer circle
 *
 * Features:
 * - Glassy backdrop blur effect (Synapse style)
 * - Distinct colors: Cyan for user speaking, Purple for AI speaking
 * - Simple pulsing animation based on audio level
 * - Clean, practical design
 */

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Mic, Volume2, Loader2 } from "lucide-react";
import type { VoiceState } from "../engine/types";

interface AudioVisualizerProps {
    audioLevel: number;
    state: VoiceState;
    size?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    audioLevel,
    state,
    size = 200,
}) => {
    // Color scheme based on state
    const getColors = () => {
        switch (state) {
            case "speaking":
                // AI speaking - Purple/Violet
                return {
                    bg: "from-purple-600/20 to-violet-600/20",
                    border: "border-purple-500/50",
                    glow: "shadow-purple-500/30",
                    ring: "ring-purple-400/40",
                    icon: "text-purple-400",
                };
            case "listening":
            case "connected":
                // User speaking/ready - Cyan/Teal
                return {
                    bg: "from-cyan-600/20 to-teal-600/20",
                    border: "border-cyan-500/50",
                    glow: "shadow-cyan-500/30",
                    ring: "ring-cyan-400/40",
                    icon: "text-cyan-400",
                };
            case "connecting":
                // Connecting - Neutral gray
                return {
                    bg: "from-gray-600/20 to-slate-600/20",
                    border: "border-gray-500/30",
                    glow: "shadow-gray-500/20",
                    ring: "ring-gray-400/30",
                    icon: "text-gray-400",
                };
            case "error":
                // Error - Red
                return {
                    bg: "from-red-600/20 to-rose-600/20",
                    border: "border-red-500/50",
                    glow: "shadow-red-500/30",
                    ring: "ring-red-400/40",
                    icon: "text-red-400",
                };
            default:
                // Idle - Dim
                return {
                    bg: "from-gray-700/10 to-slate-700/10",
                    border: "border-white/10",
                    glow: "shadow-white/5",
                    ring: "ring-white/10",
                    icon: "text-gray-500",
                };
        }
    };

    const colors = getColors();
    const isActive = state === "listening" || state === "speaking" || state === "connected";
    const pulseScale = 1 + audioLevel * 0.15; // Subtle pulse

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Outer glow ring - pulses with audio */}
            {isActive && (
                <motion.div
                    className={cn(
                        "absolute rounded-full",
                        colors.ring,
                        "ring-2"
                    )}
                    style={{ width: size * 1.15, height: size * 1.15 }}
                    animate={{
                        scale: pulseScale,
                        opacity: 0.3 + audioLevel * 0.5,
                    }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                />
            )}

            {/* Second pulse ring */}
            {isActive && audioLevel > 0.2 && (
                <motion.div
                    className={cn(
                        "absolute rounded-full border-2",
                        colors.border,
                        "opacity-30"
                    )}
                    style={{ width: size * 1.3, height: size * 1.3 }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0, 0.2],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut",
                    }}
                />
            )}

            {/* Main glassy circle */}
            <motion.div
                className={cn(
                    "relative rounded-full flex items-center justify-center",
                    // Glassy effect
                    "backdrop-blur-xl",
                    "bg-gradient-to-br",
                    colors.bg,
                    // Border
                    "border",
                    colors.border,
                    // Shadow glow
                    "shadow-2xl",
                    colors.glow,
                    // Transition
                    "transition-all duration-300"
                )}
                style={{ width: size, height: size }}
                animate={{
                    scale: isActive ? pulseScale : 1,
                }}
                transition={{ duration: 0.1, ease: "easeOut" }}
            >
                {/* Noise texture overlay */}
                <div className="absolute inset-0 rounded-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

                {/* Inner glow */}
                <div
                    className={cn(
                        "absolute inset-4 rounded-full",
                        "bg-gradient-to-br",
                        colors.bg,
                        "blur-xl opacity-50"
                    )}
                />

                {/* Icon */}
                <motion.div
                    className={cn("relative z-10", colors.icon)}
                    animate={{
                        scale: isActive ? 1 + audioLevel * 0.1 : 1,
                    }}
                    transition={{ duration: 0.1 }}
                >
                    {state === "connecting" ? (
                        <Loader2 className="w-12 h-12 animate-spin" />
                    ) : state === "speaking" ? (
                        <Volume2 className="w-12 h-12" />
                    ) : (
                        <Mic className="w-12 h-12" />
                    )}
                </motion.div>
            </motion.div>

            {/* State indicator dot */}
            <div className="absolute bottom-2 right-2">
                <div
                    className={cn(
                        "w-3 h-3 rounded-full",
                        state === "speaking"
                            ? "bg-purple-500 animate-pulse"
                            : state === "listening" || state === "connected"
                                ? "bg-cyan-500"
                                : state === "connecting"
                                    ? "bg-yellow-500 animate-pulse"
                                    : state === "error"
                                        ? "bg-red-500"
                                        : "bg-gray-500"
                    )}
                />
            </div>
        </div>
    );
};

export default AudioVisualizer;
