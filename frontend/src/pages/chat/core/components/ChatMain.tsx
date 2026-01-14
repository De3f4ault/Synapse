/**
 * ChatMain - Main chat orchestrator component
 * Manages state and switches between welcome/conversation views
 * Integrated with Synapse backend APIs
 */

import { useState } from "react";
import { ChatWelcomeScreen } from "./ChatWelcomeScreen";
import { ChatConversationView } from "./ChatConversationView";
import { LiveVoiceOverlay } from "../../voice/components/LiveVoiceOverlay";
import { useChatMessages } from "../hooks/useChatMessages";
import { useChatStreaming } from "../hooks/useChatStreaming";
import { useImplicitFeedback } from "@/modules/chat/hooks/useImplicitFeedback";
import { useAuthStore } from "@/stores/authStore";
import { useTTSAutoRead } from "@/platform/audio";

interface ChatMainProps {
  sessionId: number;
  sessionTitle?: string;
}

export function ChatMain({ sessionId, sessionTitle }: ChatMainProps) {
  const [message, setMessage] = useState("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Get user ID for telemetry
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? 0;

  // Fetch messages for this session
  const { data: messages = [], isLoading } = useChatMessages(sessionId);

  // Wire up implicit feedback loop for telemetry
  useImplicitFeedback(sessionId, messages, userId);

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

  // Audio Integration: Read AI responses aloud when streaming completes
  // TODO: Get ttsEnabled from user settings store
  useTTSAutoRead({
    enabled: true, // Replace with userSettings.ttsEnabled when available
    content: streamingContent,
    isStreaming,
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
    <div className="h-full flex flex-col">
      {isConversationStarted ? (
        <ChatConversationView
          messages={messages}
          message={message}
          sessionTitle={sessionTitle}
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
    </div>
  );
}
