/**
 * SendButton - Arrow up circle (primary color)
 * Animated send button with loading state
 */

import React from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SendButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const SendButton: React.FC<SendButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  className,
}) => {
  return (
    <motion.button
    type="submit"
    onClick={onClick}
    disabled={disabled}
    whileHover={{ scale: disabled ? 1 : 1.05 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    className={cn(
      'p-2.5 rounded-full',
      'transition-all duration-200',
      'flex items-center justify-center',
      disabled
      ? 'bg-[#353638] text-white/40 cursor-not-allowed'
      : 'bg-[#5685FE] text-white hover:bg-[#4a74e6] shadow-lg shadow-[#5685FE]/20',
      className
    )}
    aria-label={isLoading ? 'Sending...' : 'Send message'}
    >
    <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div
      key="loading"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
      >
      <Loader2 className="w-5 h-5" strokeWidth={2.5} />
      </motion.div>
    ) : (
      <motion.div
      key="send"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
      >
      <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
      </motion.div>
    )}
    </AnimatePresence>
    </motion.button>
  );
};

export default SendButton;
