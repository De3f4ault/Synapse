/**
 * SendButton - Oracle Theme
 * "Transmit Query" Interface
 *
 * Location: chat/components/input/SendButton.tsx
 */

import React from 'react';
import { Send, Loader2, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SendButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  isDeepGnosis?: boolean;
}

export const SendButton: React.FC<SendButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  className,
  isDeepGnosis = false,
}) => {
  return (
    <motion.button
    type="submit"
    onClick={onClick}
    disabled={disabled}
    whileHover={{ scale: disabled ? 1 : 1.05 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    className={cn(
      'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
      disabled
      ? 'bg-white/5 text-slate-600 cursor-not-allowed scale-90'
    : cn(
      'text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]',
         isDeepGnosis
         ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
         : 'bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.5)]'
    ),
    className
    )}
    >
    <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div
      key="loading"
      initial={{ opacity: 0, rotate: -180 }}
      animate={{ opacity: 1, rotate: 0 }}
      exit={{ opacity: 0, rotate: 180 }}
      >
      <Loader2 size={20} className="animate-spin" />
      </motion.div>
    ) : (
      <motion.div
      key="send"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      >
      {/* The Oracle uses Send, but ArrowUp is fine if you prefer it */}
      <Send size={20} className="ml-0.5" />
      </motion.div>
    )}
    </AnimatePresence>
    </motion.button>
  );
};

export default SendButton;
