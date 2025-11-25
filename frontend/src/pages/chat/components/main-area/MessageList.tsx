/**
 * MessageList - Scrollable message container
 * Handles auto-scroll and message rendering
 */

import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMessagesApiV1ChatSessionsSessionIdMessagesGet } from '@/api/generated/services.gen';
import { Message } from '../messages/Message';
import { Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoScroll } from '../../hooks/useAutoScroll';

interface MessageListProps {
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({ className }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { shouldAutoScroll } = useAutoScroll(scrollRef);

  // Fetch messages for current session
  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: () =>
    getMessagesApiV1ChatSessionsSessionIdMessagesGet({
      sessionId: parseInt(sessionId!),
                                                     limit: 100,
    }),
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);

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
      className
    )}
    >
    {messages.map((message) => (
      <Message key={message.id} message={message} />
    ))}
    </div>
  );
};

export default MessageList;
