/**
 * ChatContainer - Fixed container with internal scroll
 * Welcome screen OR message list (never both visible)
 *
 * Location: src/pages/chat/components/main-area/ChatContainer.tsx
 */

import React, { useRef, useEffect } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageList } from './MessageList';
import { cn } from '../../../../lib/utils';

interface ChatContainerProps {
  hasMessages: boolean;
  className?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  hasMessages,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && hasMessages) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [hasMessages]);

  if (!hasMessages) {
    // Welcome Screen - Just the content, no positioning
    // Input is handled separately by ChatPage.tsx
    return <WelcomeScreen />;
  }

  // Messages exist - Show scrollable message list
  return (
    <div
    ref={scrollRef}
    className={cn(
      'flex-1 overflow-y-auto overflow-x-hidden',
      'scrollbar-thin scrollbar-thumb-[#3F3F46] scrollbar-track-transparent',
      className
    )}
    >
    <div className="w-full max-w-[800px] mx-auto px-4 md:px-6 py-8 pb-32">
    <MessageList />
    </div>
    </div>
  );
};

export default ChatContainer;
