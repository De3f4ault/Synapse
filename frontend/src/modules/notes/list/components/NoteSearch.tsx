/**
 * Notes Module - NoteSearch Component
 * Search input with neural animations and keyboard shortcuts.
 *
 * MIGRATED FROM: pages/notes/components/list/NoteSearch.tsx
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Sparkles } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface NoteSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Search input for filtering notes - Synapse Creative Edition
 * Features: Neural search animation, real-time feedback, AI-powered suggestions hint
 */
export const NoteSearch: React.FC<NoteSearchProps> = ({
    value,
    onChange,
    placeholder = "SEARCH NEURAL PATHS...",
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Simulate search processing
    useEffect(() => {
        if (value) {
            setIsSearching(true);
            const timer = setTimeout(() => setIsSearching(false), 300);
            return () => clearTimeout(timer);
        }
        setIsSearching(false);
        return undefined;
    }, [value]);

    const handleClear = () => {
        onChange("");
        inputRef.current?.focus();
    };

    return (
        <div className="relative flex-1 group">
            {/* Outer glow effect when focused */}
            <motion.div
                animate={{
                    opacity: isFocused ? 1 : 0,
                    scale: isFocused ? 1 : 0.95,
                }}
                className="absolute -inset-1 bg-gradient-to-r from-[var(--synapse-cyan)]/20 via-[var(--synapse-blue)]/20 to-[var(--synapse-cyan)]/20 rounded-xl blur-md"
            />

            {/* Main search container */}
            <div className="relative">
                {/* Background with scan line effect */}
                {isFocused && (
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="absolute inset-0 bg-[var(--synapse-panel-bg)] rounded-lg"
                    >
                        <motion.div
                            animate={{
                                y: ["-100%", "200%"],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--synapse-cyan)]/5 to-transparent h-8"
                        />
                    </motion.div>
                )}

                {/* Search icon */}
                <motion.div
                    animate={{
                        rotate: isSearching ? 360 : 0,
                        scale: isFocused ? 1.1 : 1,
                    }}
                    transition={{
                        rotate: {
                            duration: 1,
                            repeat: isSearching ? Infinity : 0,
                            ease: "linear",
                        },
                        scale: { duration: 0.2 },
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                >
                    <Search
                        className="text-[var(--synapse-text-dim)] group-focus-within:text-[var(--synapse-cyan)] transition-colors"
                        size={14}
                    />
                </motion.div>

                {/* Input field */}
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="relative w-full bg-[var(--synapse-panel-bg)] border border-[var(--synapse-border-subtle)] rounded-lg py-2.5 pl-9 pr-20 text-xs font-mono text-[var(--synapse-text-primary)] focus:outline-none focus:border-[var(--synapse-cyan)]/50 focus:bg-[var(--synapse-panel-hover)] transition-all placeholder:text-[var(--synapse-text-dim)] uppercase tracking-wider z-10"
                />

                {/* Right side actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    {/* AI suggestion hint */}
                    <AnimatePresence>
                        {isFocused && !value && (
                            <motion.button
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="p-1.5 rounded-md hover:bg-[var(--synapse-cyan)]/10 transition-colors group/ai"
                                title="AI Search (Coming Soon)"
                            >
                                <Sparkles
                                    size={12}
                                    className="text-[var(--synapse-text-dim)] group-hover/ai:text-[var(--synapse-cyan)] transition-colors"
                                />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Clear button */}
                    <AnimatePresence>
                        {value && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={handleClear}
                                className="p-1.5 rounded-md hover:bg-[var(--synapse-red)]/10 transition-colors group/clear"
                                title="Clear search"
                            >
                                <X
                                    size={12}
                                    className="text-[var(--synapse-text-dim)] group-hover/clear:text-[var(--synapse-red)] transition-colors"
                                />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Keyboard shortcut hint */}
                    {!isFocused && !value && (
                        <kbd className="hidden md:flex items-center gap-1 px-2 py-1 bg-[var(--synapse-panel-bg)] border border-[var(--synapse-border-subtle)] rounded text-[9px] font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider">
                            <span>⌘</span>
                            <span>K</span>
                        </kbd>
                    )}
                </div>

                {/* Result count indicator */}
                <AnimatePresence>
                    {value && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute -bottom-6 left-0 text-[10px] font-mono text-[var(--synapse-text-dim)] uppercase tracking-wider"
                        >
                            Scanning neural paths...
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Animated underline */}
            <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isFocused ? 1 : 0 }}
                className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--synapse-cyan)] to-transparent origin-center"
            />
        </div>
    );
};
