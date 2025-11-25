/**
 * MessageList - Integrated with WebSocket streaming
 * Shows messages + live streaming content
 */

import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatMessages } from '@/pages/chat/hooks/useChatMessages';
import { useStreamingResponse } from '@/pages/chat/hooks/useStreamingResponse';
import { Message } from '../messages/Message';
import { Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MessageListProps {
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({ className }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const numericSessionId = sessionId ? parseInt(sessionId) : undefined;

  // Debug logging
  useEffect(() => {
    console.log('MessageList - sessionId:', sessionId, 'numeric:', numericSessionId);
  }, [sessionId, numericSessionId]);

  // Fetch messages
  const { data: messages, isLoading } = useChatMessages(numericSessionId);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-white/60">Loading messages...</p>
      </div>
      </div>
    );
  }

  // Empty state
  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
      <MessageSquare className="w-12 h-12 text-white/20" />
      <p className="text-white/60">No messages yet</p>
      <p className="text-sm text-white/40">Start the conversation below</p>
      </div>
      </div>
    );
  }

  return (
    <div
    ref={scrollRef}
    className={cn(
      'flex-1 overflow-y-auto overflow-x-hidden',
      'py-6 space-y-6',
      'scroll-smooth',
      'scrollbar-thin scrollbar-thumb-[#3F3F46] scrollbar-track-transparent',
      className
    )}
    >
    <div className="w-full max-w-[800px] mx-auto px-4 md:px-6">
    {/* Render all messages */}
    {messages.map((message) => (
      <Message
      key={message.id}
      id={message.id}
      role={message.role as 'user' | 'assistant'}
      content={message.content}
      timestamp={message.created_at}
      />
    ))}
    </div>
    </div>
  );
};

export default MessageList;
