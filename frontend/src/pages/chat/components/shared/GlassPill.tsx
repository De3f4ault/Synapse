/**
 * GlassPill - Oracle Theme
 * Toggle buttons and tags.
 *
 * Location: chat/components/shared/GlassPill.tsx
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
    whileHover={disabled ? undefined : { scale: 1.05 }}
    whileTap={disabled ? undefined : { scale: 0.95 }}
    className={cn(
      'relative px-4 py-1.5 rounded-full',
      'text-xs font-mono uppercase tracking-wider transition-all duration-300',
      'flex items-center gap-2 border',
      disabled && 'opacity-50 cursor-not-allowed',

      // Active State: Cyan Glow
      active
      ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
      : 'bg-white/5 border-white/5 text-slate-400 hover:text-cyan-200 hover:border-cyan-500/20 hover:bg-white/10',

      className
    )}
    >
    {children}
    </motion.button>
  );
};

export default GlassPill;
