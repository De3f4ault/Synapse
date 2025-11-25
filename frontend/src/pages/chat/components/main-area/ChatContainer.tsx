/**
 * ChatContainer - Fixed container with internal scroll
 * Welcome screen OR message list (never both visible)
 *
 * Location: src/pages/chat/components/main-area/ChatContainer.tsx
 */

import React, { useRef, useEffect } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageList } from './MessageList';
import { MainInput } from '../input/MainInput';
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
    // Welcome Screen - Fixed, centered vertically and horizontally
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
      <WelcomeScreen />

      {/* Centered Input - Part of welcome screen */}
      <div className="w-full max-w-[720px] mt-12">
      <MainInput isCentered={true} />
      </div>
      </div>
    );
  }

  // Messages exist - Show scrollable message list
  return (
    <div
    ref={scrollRef}
    className={cn(
      'absolute inset-0',
      'overflow-y-auto overflow-x-hidden',
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
