/**
 * ChatMain - Main chat orchestrator component
 * Manages state and switches between welcome/conversation views
 * Integrated with Synapse backend APIs
 */

import { useState } from "react";
import { ChatWelcomeScreen } from "./chat-welcome-screen";
import { ChatConversationView } from "./chat-conversation-view";
import { LiveVoiceOverlay } from "./live-voice-overlay";
import { useChatMessages } from "../hooks/useChatMessages";
import { useChatStreaming } from "../hooks/useChatStreaming";

interface ChatMainProps {
  sessionId: number;
}

export function ChatMain({ sessionId }: ChatMainProps) {
  const [message, setMessage] = useState("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Fetch messages for this session
  const { data: messages = [], isLoading } = useChatMessages(sessionId);

  // WebSocket streaming
  const {
    isStreaming,
    streamingContent,
    streamingThinking,
    sendMessage: sendStreamingMessage,
    isConnected,
  } = useChatStreaming({
    sessionId,
    autoConnect: true,
  });

  const isConversationStarted = messages.length > 0;

  const handleSend = () => {
    if (!message.trim()) return;
    if (!isConnected) {
      console.error("[ChatMain] Cannot send - WebSocket not connected");
      return;
    }

    try {
      sendStreamingMessage(message);
      setMessage("");
    } catch (error) {
      console.error("[ChatMain] Failed to send message:", error);
    }
  };

  const handleReset = () => {
    // Navigate to new session or clear current
    // For now, just clear the input
    setMessage("");
  };

  const handleVoiceClick = () => {
    setIsVoiceOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {isConversationStarted ? (
        <ChatConversationView
          messages={messages}
          message={message}
          onMessageChange={setMessage}
          onSend={handleSend}
          onReset={handleReset}
          onVoiceClick={handleVoiceClick}
          isSending={isStreaming}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          streamingThinking={streamingThinking}
        />
      ) : (
        <ChatWelcomeScreen
          message={message}
          onMessageChange={setMessage}
          onSend={handleSend}
          onVoiceClick={handleVoiceClick}
        />
      )}

      {/* Voice Mode Overlay */}
      <LiveVoiceOverlay
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        systemInstruction="You are Synapse, a helpful AI learning assistant."
        enableSearch={true}
      />
    </>
  );
}
