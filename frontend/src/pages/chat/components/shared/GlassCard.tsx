/**
 * GlassCard - Oracle Theme
 * Standard container with deep glassmorphism and cyan interactive borders.
 *
 * Location: chat/components/shared/GlassCard.tsx
 */

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = false,
  ...motionProps
}) => {
  return (
    <motion.div
    whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
    className={cn(
      'rounded-xl',
      'bg-black/40 backdrop-blur-xl',
      'border border-white/5',
      'shadow-lg shadow-black/50',
      hover && 'transition-all duration-300 hover:border-cyan-500/30 hover:shadow-cyan-500/10',
      className
    )}
    {...motionProps}
    >
    {children}
    </motion.div>
  );
};

export default GlassCard;
