/**
 * ChatMain - Main chat orchestrator component
 * Manages state and switches between welcome/conversation views
 * Integrated with Synapse backend APIs
 */

import { useState } from "react";
import { ChatWelcomeScreen } from "./chat-welcome-screen";
import { ChatConversationView } from "./chat-conversation-view";
import { useChatMessages, useSendMessage } from "../hooks/useChatMessages";

interface ChatMainProps {
  sessionId: number;
}

export function ChatMain({ sessionId }: ChatMainProps) {
  const [message, setMessage] = useState("");

  // Fetch messages for this session
  const { data: messages = [], isLoading } = useChatMessages(sessionId);

  // Send message mutation
  const sendMessageMutation = useSendMessage(sessionId);

  const isConversationStarted = messages.length > 0;

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessageMutation.mutate(message, {
      onSuccess: () => {
        setMessage("");
      },
    });
  };

  const handleReset = () => {
    // Navigate to new session or clear current
    // For now, just clear the input
    setMessage("");
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isConversationStarted) {
    return (
      <ChatConversationView
        messages={messages}
        message={message}
        onMessageChange={setMessage}
        onSend={handleSend}
        onReset={handleReset}
        isSending={sendMessageMutation.isPending}
      />
    );
  }

  return (
    <ChatWelcomeScreen
      message={message}
      onMessageChange={setMessage}
      onSend={handleSend}
    />
  );
}
