/**
 * IconButton - Oracle Theme
 * Circular interactive triggers.
 *
 * Location: chat/components/shared/IconButton.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconButtonProps {
  icon: React.ElementType;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'md',
  className,
  title,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2.5',
    lg: 'w-12 h-12 p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    default: 'bg-white/5 border border-white/5 text-slate-400 hover:text-cyan-200 hover:border-cyan-500/30 hover:bg-white/10',
      primary: 'bg-cyan-600 border border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500',
      danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300',
      ghost: 'bg-transparent border-transparent text-slate-500 hover:text-cyan-400 hover:bg-white/5',
  };

  return (
    <motion.button
    onClick={onClick}
    disabled={disabled || loading}
    whileHover={disabled || loading ? undefined : { scale: 1.1 }}
    whileTap={disabled || loading ? undefined : { scale: 0.9 }}
    className={cn(
      'rounded-full flex items-center justify-center transition-all duration-300',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses[size],
      variantClasses[variant],
      className
    )}
    title={title}
    >
    {loading ? (
      <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
    ) : (
      <Icon className={iconSizes[size]} />
    )}
    </motion.button>
  );
};

export default IconButton;
