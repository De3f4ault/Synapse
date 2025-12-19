import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FloatingPageDockProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Standardized "Floating Dock" for page actions (Search, Filters, Create).
 * Replaces top toolbars with a bottom-anchored, pill-shaped container.
 */
export function FloatingPageDock({ children, className }: FloatingPageDockProps) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 pointer-events-none">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                    "relative flex items-center gap-2 p-2 rounded-full pointer-events-auto shadow-2xl transition-all duration-300",
                    "bg-black/20 backdrop-blur-xl border border-white/10",
                    className
                )}
            >
                {children}
            </motion.div>
        </div>
    );
}
