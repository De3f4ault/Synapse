/**
 * GlassCard - "Synapse" Base Component
 * * Features:
 * - Specific backdrop blur and noise texture for the sci-fi look
 * - Neon border glow on hover
 * - Standardized rounded corners and padding
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
                // Base Structure
                'relative overflow-hidden rounded-xl',
                // Glass Background & Border
                'bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5',
                // Shadow
                'shadow-2xl shadow-black/50',

                // Interaction
                hover && [
                    'transition-all duration-300',
                    'hover:bg-[#0A0A0A]/80 hover:border-white/10',
                    'hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]'
                ],
                onClick && 'cursor-pointer',

                className
            )}
            onClick={onClick}
            {...motionProps}
            >
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

            {/* Gradient Reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0" />

            {/* Content */}
            <div className="relative z-10 h-full">
            {children}
            </div>
            </motion.div>
        );
    }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
