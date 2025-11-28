/**
 * UserMessage - Oracle Theme
 * "The Operator" - Right aligned, functional, dark slate aesthetic.
 *
 * Location: chat/components/messages/UserMessage.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageProps } from './Message';

export const UserMessage: React.FC<Pick<MessageProps, 'id' | 'content' | 'timestamp'>> = ({
  content,
  timestamp,
}) => {
  const timeString = timestamp
  ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : '';

  return (
    <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex w-full justify-end pl-12 mb-8 group"
    >
    <div className="flex flex-row-reverse gap-4 max-w-2xl w-full">
    {/* Operator Avatar */}
    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border border-slate-700 bg-slate-900 text-slate-300 shadow-lg">
    <span className="font-mono text-[10px] tracking-tighter">OP</span>
    </div>

    {/* Message Bubble */}
    <div className="flex flex-col items-end max-w-full">
    <div className={cn(
      "text-base leading-7 rounded-2xl rounded-tr-sm px-6 py-4 whitespace-pre-wrap shadow-xl backdrop-blur-md",
      "bg-white/5 border border-white/10 text-slate-200"
    )}>
    {content}
    </div>

    {/* Timestamp */}
    <div className="mt-2 text-[10px] font-mono text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-50 transition-opacity">
    {timeString}
    </div>
    </div>
    </div>
    </motion.div>
  );
};

export default UserMessage;
