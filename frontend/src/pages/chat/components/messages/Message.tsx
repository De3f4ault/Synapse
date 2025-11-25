/**
 * Message - Wrapper component that routes to UserMessage or AssistantMessage
 * Handles proper styling for each message type
 *
 * Location: src/pages/chat/components/messages/Message.tsx
 */

import React from 'react';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

export interface MessageProps {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export const Message: React.FC<MessageProps> = (props) => {
  if (props.role === 'user') {
    return <UserMessage {...props} />;
  }

  return <AssistantMessage {...props} />;
};

export default Message;
