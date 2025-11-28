/**
 * MessageList - Oracle Theme
 * Displays the scroll of knowledge.
 *
 * Location: chat/components/main-area/MessageList.tsx
 */

import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatMessages } from '@/pages/chat/hooks/useChatMessages';
import { Message } from '../messages/Message'; // Ensure this component is updated later
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Decrypting thought simulation (Simple version for list)
const DecryptingStatus = () => (
  <div className="flex items-center gap-3 text-cyan-500/80 font-mono text-xs tracking-widest animate-pulse pl-12 py-4">
  <Loader2 size={14} className="animate-spin" />
  <span className="uppercase">DECRYPTING_TRUTH_MATRIX...</span>
  </div>
);

interface MessageListProps {
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({ className }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const numericSessionId = sessionId ? parseInt(sessionId) : undefined;

  // Data Fetching
  const { data: messages, isLoading } = useChatMessages(numericSessionId);

  // Note: Auto-scroll is handled by the parent ChatContainer to ensure smooth behavior

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-20">
      <DecryptingStatus />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col space-y-8", className)}>
    {messages?.map((message, idx) => (
      <motion.div
      key={message.id || idx}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      >
      <Message
      id={message.id}
      role={message.role as 'user' | 'assistant'}
      content={message.content}
      timestamp={message.created_at}
      // Add Oracle specific props if Message component supports them later
      // artifact={message.artifact}
      />
      </motion.div>
    ))}

    {/* We can add a "Processing" indicator here if we have that state available */}
    </div>
  );
};

export default MessageList;
