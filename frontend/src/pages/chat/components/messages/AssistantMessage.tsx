/**
 * AssistantMessage - Appears on dark canvas (#151517 background)
 * Left-aligned with avatar, markdown support
 *
 * Location: src/pages/chat/components/messages/AssistantMessage.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Copy, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageProps } from './Message';
import { MessageMarkdown } from './MessageMarkdown';

export const AssistantMessage: React.FC<MessageProps> = ({
  content,
  timestamp,
  isStreaming = false,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="w-full mb-6"
    onMouseEnter={() => setShowActions(true)}
    onMouseLeave={() => setShowActions(false)}
    >
    {/* AI Avatar & Name */}
    <div className="flex items-center gap-2.5 mb-3">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5685FE] to-[#4574ed] flex items-center justify-center shadow-[0_0_12px_rgba(86,133,254,0.25)]">
    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
    </svg>
    </div>
    <span className="text-sm font-medium text-white/90">Synapse</span>
    </div>

    {/* Message Content - On dark background */}
    <div className="relative group pl-9">
    <div className="prose prose-invert max-w-none">
    <MessageMarkdown content={content} />
    </div>

    {/* Action Buttons - Show on hover */}
    {!isStreaming && showActions && (
      <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1 mt-3"
      >
      <button
      onClick={() => navigator.clipboard.writeText(content)}
      className="p-1.5 rounded-lg hover:bg-[#2C2C2E] text-white/50 hover:text-white transition-all duration-200"
      title="Copy"
      >
      <Copy className="w-3.5 h-3.5" />
      </button>
      <button
      className="p-1.5 rounded-lg hover:bg-[#2C2C2E] text-white/50 hover:text-white transition-all duration-200"
      title="Regenerate"
      >
      <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <button
      className="p-1.5 rounded-lg hover:bg-[#2C2C2E] text-white/50 hover:text-white transition-all duration-200"
      title="Good response"
      >
      <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
      className="p-1.5 rounded-lg hover:bg-[#2C2C2E] text-white/50 hover:text-white transition-all duration-200"
      title="Bad response"
      >
      <ThumbsDown className="w-3.5 h-3.5" />
      </button>
      </motion.div>
    )}
    </div>
    </motion.div>
  );
};

export default AssistantMessage;
