/**
 * LiveVoiceOverlay - Full-screen voice interaction UI
 *
 * Features:
 * - Audio level visualizer (pulsing circle)
 * - State indicator (Connecting/Listening/Speaking)
 * - Transcript display
 * - Mute and End controls
 */

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mic,
    MicOff,
    X,
    Loader2,
    Volume2,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveVoice } from "../hooks/useLiveVoice";
import { AudioVisualizer } from "./AudioVisualizer";
import type { VoiceState } from "../engine/types";

interface LiveVoiceOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    systemInstruction?: string;
    enableSearch?: boolean;
}

export const LiveVoiceOverlay: React.FC<LiveVoiceOverlayProps> = ({
    isOpen,
    onClose,
    systemInstruction,
    enableSearch = true,
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [groundingSources, setGroundingSources] = useState<
        Array<{ uri?: string; title?: string }>
    >([]);

    const {
        state,
        startSession,
        endSession,
        interrupt,
        inputTranscript,
        outputTranscript,
        audioLevel,
    } = useLiveVoice({
        systemInstruction,
        enableSearch,
        onTranscript: (text, isFinal, isInput) => {
            console.log("[LiveVoice] Transcript:", { text, isFinal, isInput });
        },
        onGrounding: (metadata) => {
            console.log("[LiveVoice] Grounding:", metadata);
            if (metadata.chunks) {
                setGroundingSources(metadata.chunks as Array<{ uri?: string; title?: string }>);
            }
        },
        onError: (error) => {
            console.error("[LiveVoice] Error:", error);
        },
        onStateChange: (newState) => {
            console.log("[LiveVoice] State:", newState);
        },
    });

    // Track if we've attempted to start (prevents infinite retry on error)
    const hasAttemptedRef = useRef(false);

    // Start session when overlay opens
    useEffect(() => {
        if (isOpen && state === "idle" && !hasAttemptedRef.current) {
            hasAttemptedRef.current = true;
            startSession();
        }

        // Reset when overlay closes
        if (!isOpen) {
            hasAttemptedRef.current = false;
        }
    }, [isOpen, state, startSession]);

    // Handle close
    const handleClose = () => {
        endSession();
        setGroundingSources([]);
        onClose();
    };

    // Get state display info
    const getStateInfo = (
        state: VoiceState
    ): { label: string; color: string; icon: React.ReactNode } => {
        switch (state) {
            case "connecting":
                return {
                    label: "Connecting...",
                    color: "text-yellow-400",
                    icon: <Loader2 className="w-5 h-5 animate-spin" />,
                };
            case "connected":
            case "listening":
                return {
                    label: "Listening",
                    color: "text-accent-olive",
                    icon: <Mic className="w-5 h-5" />,
                };
            case "speaking":
                return {
                    label: "Speaking",
                    color: "text-info",
                    icon: <Volume2 className="w-5 h-5" />,
                };
            case "error":
                return {
                    label: "Error",
                    color: "text-destructive",
                    icon: <X className="w-5 h-5" />,
                };
            default:
                return {
                    label: "Ready",
                    color: "text-gray-400",
                    icon: <Mic className="w-5 h-5" />,
                };
        }
    };

    const stateInfo = getStateInfo(state);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            >
                {/* Background gradient — pointer-events-none so clicks pass through */}
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-blue-900/20 pointer-events-none" />

                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 z-20 p-3 rounded-full bg-foreground/10 hover:bg-foreground/15 transition-colors"
                >
                    <X className="w-6 h-6 text-foreground" />
                </button>

                {/* Main content */}
                <div className="relative flex flex-col items-center gap-8 max-w-lg px-6">
                    {/* Audio visualizer */}
                    <AudioVisualizer
                        audioLevel={audioLevel}
                        state={state}
                        size={220}
                    />

                    {/* State label */}
                    <div className={cn("flex items-center gap-2", stateInfo.color)}>
                        {stateInfo.icon}
                        <span className="text-lg font-medium">{stateInfo.label}</span>
                    </div>

                    {/* Transcripts */}
                    <div className="w-full space-y-3">
                        {/* Input transcript (what user said) */}
                        {inputTranscript && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-lg bg-foreground/5 border border-border"
                            >
                                <p className="text-sm text-gray-400 mb-1">You said:</p>
                                <p className="text-foreground">{inputTranscript}</p>
                            </motion.div>
                        )}

                        {/* Output transcript (what AI is saying) */}
                        {outputTranscript && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-lg bg-info/10 border border-blue-500/20"
                            >
                                <p className="text-sm text-info mb-1">AI:</p>
                                <p className="text-foreground">{outputTranscript}</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Grounding sources */}
                    {groundingSources.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full"
                        >
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                <Search className="w-4 h-4" />
                                <span>Sources</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {groundingSources.slice(0, 3).map((source, i) => (
                                    <a
                                        key={i}
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 text-xs rounded-full bg-foreground/5 hover:bg-muted text-gray-300 transition-colors"
                                    >
                                        {source.title || source.uri || "Source"}
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-4 mt-4 relative z-10">
                        {/* Mute button */}
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "p-4 rounded-full transition-colors",
                                isMuted
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-foreground/10 text-foreground hover:bg-foreground/15"
                            )}
                        >
                            {isMuted ? (
                                <MicOff className="w-6 h-6" />
                            ) : (
                                <Mic className="w-6 h-6" />
                            )}
                        </button>

                        {/* Interrupt button (tap to stop AI) */}
                        {state === "speaking" && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={interrupt}
                                className="px-6 py-3 rounded-full bg-foreground/10 text-foreground hover:bg-foreground/15 transition-colors"
                            >
                                Tap to interrupt
                            </motion.button>
                        )}

                        {/* End session button */}
                        <button
                            onClick={handleClose}
                            className="p-4 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Instructions */}
                    <p className="text-sm text-gray-500 text-center">
                        {state === "listening"
                            ? "Start speaking - I'm listening"
                            : state === "speaking"
                                ? "Tap anywhere or speak to interrupt"
                                : state === "connecting"
                                    ? "Setting up voice connection..."
                                    : "Voice mode active"}
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LiveVoiceOverlay;
