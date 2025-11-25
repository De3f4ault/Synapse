/**
 * GlassCard - Reusable glass card
 * Glassmorphism card component with backdrop blur
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
      'bg-[#1D1E22]/60 backdrop-blur-xl',
      'border border-[#353638]',
      'shadow-lg',
      hover && 'transition-shadow duration-200 hover:shadow-xl',
      className
    )}
    {...motionProps}
    >
    {children}
    </motion.div>
  );
};

export default GlassCard;
