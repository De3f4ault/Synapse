/**
 * ChatContainer - NotebookLM Style
 * The primary viewport for chat messages
 * Handles scrolling and layout for both Welcome state and Active Conversation
 *
 * Location: frontend/src/pages/chat/components/main-area/ChatContainer.tsx
 */

/**
 * ChatContainer - NotebookLM Style
 * The primary viewport for chat messages
 * Handles scrolling and layout for Active Conversation
 *
 * Location: frontend/src/pages/chat/components/main-area/ChatContainer.tsx
 */

import React from 'react';
import { MessageList } from './MessageList';

interface ChatContainerProps {
  hasMessages: boolean;
  className?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  hasMessages,
  className,
}) => {
  if (!hasMessages) {
    return null;
  }

  return (
    <div className={`w-full max-w-5xl mx-auto px-4 md:px-8 py-8 pb-32 ${className || ''}`}>
    <MessageList />
    </div>
  );
};

export default ChatContainer;
