/**
 * Message - Oracle Theme
 * Router for the visual representation of data streams.
 *
 * Location: chat/components/messages/Message.tsx
 */

import React from 'react';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import type { ChatMessage } from '../../types/chat.types';

export interface MessageProps {
  id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | number;
  isStreaming?: boolean;
  // Oracle Specifics
  artifact?: ChatMessage['artifact'];
  isDecryption?: boolean;
}

export const Message: React.FC<MessageProps> = (props) => {
  if (props.role === 'user') {
    return (
      <UserMessage
      id={props.id}
      content={props.content}
      timestamp={props.timestamp}
      />
    );
  }

  return (
    <AssistantMessage
    id={props.id}
    content={props.content}
    timestamp={props.timestamp}
    isStreaming={props.isStreaming}
    artifact={props.artifact}
    />
  );
};

export default Message;
