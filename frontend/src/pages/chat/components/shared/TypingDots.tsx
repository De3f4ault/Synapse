/**
 * TypingDots - Animated typing indicator
 * Three dots bouncing animation for AI thinking state
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TypingDotsProps {
  className?: string;
}

export const TypingDots: React.FC<TypingDotsProps> = ({ className }) => {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 },
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
      transition={{
        duration: 0.4,
        ease: 'easeInOut',
      }}
      className="w-2 h-2 rounded-full bg-[#5685FE]"
      />
    ))}
    </motion.div>
  );
};

export default TypingDots;
