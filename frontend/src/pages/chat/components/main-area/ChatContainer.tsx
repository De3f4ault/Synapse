/**
 * ChatContainer - Oracle Theme
 * The primary viewport for the Oracle's visions.
 * Handles scrolling and layout for both the Welcome state and Active Conversation.
 *
 * Location: chat/components/main-area/ChatContainer.tsx
 */

import React, { useRef, useEffect } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageList } from './MessageList';
import { cn } from '@/lib/utils';

interface ChatContainerProps {
  hasMessages: boolean;
  className?: string;
  isDeepGnosis?: boolean;
  toggleSidebar?: () => void;
  sidebarOpen?: boolean;
  toggleGnosis?: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  hasMessages,
  className,
  isDeepGnosis,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && hasMessages) {
      // Smooth scroll to bottom
      const scrollToBottom = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      };

      // Small delay to ensure content is rendered
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [hasMessages]);

  if (!hasMessages) {
    // Welcome State: Just the welcome screen content (no wrapper needed)
    return <WelcomeScreen />;
  }

  // Message State: Full content with proper padding
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 pb-32">
    <MessageList />
    </div>
  );
};

export default ChatContainer;
