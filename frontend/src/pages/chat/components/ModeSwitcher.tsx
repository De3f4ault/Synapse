import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ModeSwitcher - Creative Chat Mode Toggle
 * 
 * Floating toggle to switch between Normal and Study chat modes
 * Features:
 * - Morphing icon animation
 * - Glassmorphism styling
 * - Keyboard shortcut indicator
 * - Smooth transitions
 */

interface ModeSwitcherProps {
    mode: 'normal' | 'study';
    onModeChange: (mode: 'normal' | 'study') => void;
    className?: string;
}

export function ModeSwitcher({ mode, onModeChange, className }: ModeSwitcherProps) {
    const isStudyMode = mode === 'study';

    return (
        <motion.div
            className={cn("z-50", className)}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
            <button
                onClick={() => onModeChange(isStudyMode ? 'normal' : 'study')}
                className={cn(
                    "group relative flex items-center gap-3 px-4 py-2 rounded-full",
                    "bg-black/60 backdrop-blur-xl border border-white/10",
                    "hover:border-cyan-500/50 transition-all duration-300",
                    "shadow-[0_0_30px_rgba(0,0,0,0.3)]",
                    "hover:scale-105 active:scale-95"
                )}
            >
                {/* Icon Container with Morph Animation */}
                <div className="relative w-6 h-6 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ rotateY: 90, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            exit={{ rotateY: -90, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            {isStudyMode ? (
                                <BookOpen className="w-5 h-5 text-cyan-400" />
                            ) : (
                                <MessageSquare className="w-5 h-5 text-cyan-400" />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Label */}
                <span className="text-sm font-medium text-white">
                    {isStudyMode ? 'Study Mode' : 'Normal Mode'}
                </span>

                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 rounded-full bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            </button>

            {/* Keyboard Hint */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-cyan-400">⌘M</kbd> to toggle
            </div>
        </motion.div>
    );
}
