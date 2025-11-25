/**
 * Message - Wrapper component
 * Routes to UserMessage or AssistantMessage
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
    />
  );
};

export default Message;
