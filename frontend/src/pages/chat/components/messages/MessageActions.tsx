/**
 * MessageActions - Copy, regenerate icons
 * Appears on hover with smooth animations
 */

import React, { useState } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, copyToClipboard } from '@/lib/utils';
import type { ChatMessageResponse } from '@/api/generated/types.gen';
import { toast } from 'sonner';

interface MessageActionsProps {
  message: ChatMessageResponse;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleRegenerate = () => {
    toast.info('Regenerate feature coming soon');
    // TODO: Implement regenerate message functionality
  };

  return (
    <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    {/* Copy Button */}
    <motion.button
    onClick={handleCopy}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'p-1.5 rounded-md',
      'transition-colors duration-200',
      copied
      ? 'bg-green-500/20 text-green-400'
      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
    )}
    aria-label="Copy message"
    >
    <AnimatePresence mode="wait">
    {copied ? (
      <motion.div
      key="check"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      >
      <Check className="w-4 h-4" />
      </motion.div>
    ) : (
      <motion.div
      key="copy"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      >
      <Copy className="w-4 h-4" />
      </motion.div>
    )}
    </AnimatePresence>
    </motion.button>

    {/* Regenerate Button */}
    <motion.button
    onClick={handleRegenerate}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'p-1.5 rounded-md',
      'bg-white/5 text-white/60',
      'hover:bg-white/10 hover:text-white',
      'transition-colors duration-200'
    )}
    aria-label="Regenerate response"
    >
    <RotateCcw className="w-4 h-4" />
    </motion.button>
    </div>
  );
};

export default MessageActions;
