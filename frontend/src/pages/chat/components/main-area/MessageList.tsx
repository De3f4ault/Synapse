/**
<<<<<<< HEAD
 * MessageList - Oracle Theme with Unified Streaming (UPDATED)
 * Uses centralized WebSocketManager with channel subscriptions
=======
 * MessageList - Oracle Theme with Streaming Support
 * Displays the scroll of knowledge with real-time streaming
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
 */

import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatMessages } from '@/pages/chat/hooks/useChatMessages';
<<<<<<< HEAD
import { useChatStreaming } from '@/pages/chat/hooks/useChatStreaming';
=======
import { useStreamingResponse } from '@/pages/chat/hooks/useStreamingResponse';
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
import { Message } from '../messages/Message';
import { StreamingMessage } from '../messages/StreamingMessage';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Decrypting thought simulation
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Data Fetching
  const { data: messages, isLoading } = useChatMessages(numericSessionId);

<<<<<<< HEAD
  // Streaming state - NOW USES UNIFIED MANAGER
=======
  // Streaming state
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
  const {
    isStreaming,
    streamingContent,
    streamingThinking,
    streamingSources,
    currentModel,
<<<<<<< HEAD
  } = useChatStreaming({
=======
  } = useStreamingResponse({
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
    sessionId: numericSessionId,
    autoConnect: false, // Don't auto-connect here, ChatInput handles it
  });

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length, streamingContent, isStreaming]);

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-20">
      <DecryptingStatus />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col space-y-8", className)}>
    {/* Existing Messages */}
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
      isStreaming={false}
      />
      </motion.div>
    ))}

    {/* Streaming Assistant Message */}
    {isStreaming && (streamingContent || streamingThinking) && (
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      >
      <StreamingMessage
      content={streamingContent}
      thinking={streamingThinking}
      sources={streamingSources}
      model={currentModel}
      />
      </motion.div>
    )}

    {/* Scroll anchor */}
    <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
