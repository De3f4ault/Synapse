/**
 * ProgressBar - Visual completion indicator
 * Animated progress bar with gradient fill
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function ProgressBar({
  progress,
  className,
  showLabel = false,
  height = 'md',
  animated = true
}: ProgressBarProps) {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const getColor = () => {
    if (progress >= 80) return 'from-green-500 to-emerald-500';
    if (progress >= 50) return 'from-cyan-500 to-blue-500';
    if (progress >= 25) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-orange-500';
  };

  return (
    <div className={cn("space-y-1", className)}>
    {showLabel && (
      <div className="flex justify-between text-xs">
      <span className="text-slate-500">Progress</span>
      <span className="text-white font-semibold">{progress}%</span>
      </div>
    )}

    <div className={cn(
      "w-full bg-white/10 rounded-full overflow-hidden",
      heightClasses[height]
    )}>
    <motion.div
    initial={animated ? { width: 0 } : { width: `${progress}%` }}
    animate={{ width: `${progress}%` }}
    transition={{ duration: 1, ease: 'easeOut' }}
    className={cn(
      "h-full rounded-full bg-gradient-to-r",
      getColor()
    )}
    />
    </div>
    </div>
  );
}
