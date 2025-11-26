/**
 * GlassCard - Glassmorphism card component
 *
 * Features:
 * - Glass morphism styling with blur and transparency
 * - Optional hover effects
 * - Smooth animations via Framer Motion
 * - Flexible styling with className override
 */

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends Omit<MotionProps, 'children'> {
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
                // Base glass morphism styles
                'relative overflow-hidden rounded-xl',
                'bg-white/5 backdrop-blur-xl',
                'border border-white/10',
                'shadow-lg shadow-black/20',

                // Hover effects
                hover && [
                    'transition-all duration-300',
                    'hover:bg-white/8',
                    'hover:border-white/20',
                    'hover:shadow-xl hover:shadow-black/30',
                ],

                // Click handler cursor
                onClick && 'cursor-pointer',

                // Custom classes
                className
            )}
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            {...motionProps}
            >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
            {children}
            </div>
            </motion.div>
        );
    }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
