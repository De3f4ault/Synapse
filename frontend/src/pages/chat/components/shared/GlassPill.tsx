/**
 * GlassPill - Rounded pill buttons (mode toggles)
 * Pill-shaped button with glass styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassPillProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const GlassPill: React.FC<GlassPillProps> = ({
  children,
  active = false,
  onClick,
  disabled = false,
  className,
}) => {
  return (
    <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={disabled ? undefined : { scale: 1.02 }}
    whileTap={disabled ? undefined : { scale: 0.98 }}
    className={cn(
      'relative px-4 py-2 rounded-full',
      'text-sm font-medium transition-all duration-200',
      'flex items-center gap-2',
      disabled && 'opacity-50 cursor-not-allowed',
      !disabled && !active && 'hover:bg-[#353638]/30',
      active
      ? 'bg-[#5685FE] text-white shadow-lg shadow-[#5685FE]/20'
      : 'bg-[#1D1E22]/60 backdrop-blur-sm border border-[#353638] text-white/70',
      className
    )}
    >
    {children}
    </motion.button>
  );
};

export default GlassPill;
