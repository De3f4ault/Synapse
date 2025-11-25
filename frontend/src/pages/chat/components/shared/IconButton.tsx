/**
 * IconButton - Circular glass icon buttons
 * Reusable icon button with glass styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconButtonProps {
  icon: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    default:
      'bg-[#353638]/50 hover:bg-[#353638] text-white/70 hover:text-white',
      primary:
      'bg-[#5685FE] hover:bg-[#4a74e6] text-white shadow-lg shadow-[#5685FE]/20',
      danger:
      'bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300',
  };

  return (
    <motion.button
    onClick={onClick}
    disabled={disabled || loading}
    whileHover={disabled || loading ? undefined : { scale: 1.05 }}
    whileTap={disabled || loading ? undefined : { scale: 0.95 }}
    className={cn(
      'rounded-full',
      'flex items-center justify-center',
      'border border-[#353638]',
      'transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses[size],
      variantClasses[variant],
      className
    )}
    aria-label={ariaLabel}
    >
    {loading ? (
      <Loader2
      className={cn(iconSizes[size], 'animate-spin')}
      strokeWidth={2}
      />
    ) : (
      <Icon className={iconSizes[size]} strokeWidth={2} />
    )}
    </motion.button>
  );
};

export default IconButton;
