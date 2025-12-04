/**
 * TypingDots - Oracle Theme
 * Minimalist thinking indicator.
 *
 * Location: chat/components/shared/TypingDots.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TypingDotsProps {
  className?: string;
}

export const TypingDots: React.FC<TypingDotsProps> = ({ className }) => {
  const dotVariants = {
    initial: { y: 0, opacity: 0.5 },
    animate: { y: -6, opacity: 1 },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15,
        repeat: Infinity,
        repeatType: 'reverse' as const,
      },
    },
  };

  return (
    <motion.div
    variants={containerVariants}
    initial="initial"
    animate="animate"
    className={cn('flex items-center gap-1.5', className)}
    >
    {[0, 1, 2].map((index) => (
      <motion.div
      key={index}
      variants={dotVariants}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_cyan]"
      />
    ))}
    </motion.div>
  );
};

export default TypingDots;
