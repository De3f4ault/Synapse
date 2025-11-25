/**
 * UserMessage - Same color as input box (#2C2C2E)
 * Right-aligned with beautiful rounded corners
 *
 * Location: src/pages/chat/components/messages/UserMessage.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageProps } from './Message';

export const UserMessage: React.FC<MessageProps> = ({
  content,
  timestamp,
}) => {
  return (
    <motion.div
    initial={{ opacity: 0, y: 10, x: 10 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="flex justify-end mb-6"
    >
    <div
    className={cn(
      'max-w-[75%] px-5 py-3.5 rounded-[20px]',
      'bg-[#2C2C2E]',
      'border border-[#3F3F46]',
      'shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
    )}
    >
    <p className="text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap break-words">
    {content}
    </p>
    </div>
    </motion.div>
  );
};

export default UserMessage;
