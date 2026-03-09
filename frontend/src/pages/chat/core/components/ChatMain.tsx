/**
 * ChatMain - Main chat orchestrator component
 * Manages state and switches between welcome/conversation views
 * Integrated with Synapse backend APIs
 */

import { useState, useEffect } from "react";
import { ChatWelcomeScreen } from "./ChatWelcomeScreen";
import { ChatConversationView } from "./ChatConversationView";
import { ThreadPanel } from "./ThreadPanel";
import { LiveVoiceOverlay } from "../../voice/components/LiveVoiceOverlay";
import { useChatMessages } from "../hooks/useChatMessages";
import { useChatStreaming } from "../hooks/useChatStreaming";
import { useImplicitFeedback } from "@/modules/chat/hooks/useImplicitFeedback";
import { useAuthStore } from "@/stores/authStore";
import { useTTSAutoRead } from "@/platform/audio/hooks/useTTSAutoRead";
import { useThreadStore } from "../state/threadStore";

interface ChatMainProps {
  sessionId: number;
  sessionTitle?: string;
}

export function ChatMain({ sessionId, sessionTitle }: ChatMainProps) {
  const [message, setMessage] = useState("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [threadPanelWidth, setThreadPanelWidth] = useState(384);

  // Get user ID for telemetry
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? 0;

  // Thread store - reset on session change
  const resetThreadStore = useThreadStore((state) => state.reset);
  useEffect(() => {
    resetThreadStore();
  }, [sessionId, resetThreadStore]);

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
    stopGeneration,
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

  const handleStop = () => {
    stopGeneration();
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
    <div className="h-full flex flex-row">
      <div className="flex-1 flex flex-col min-w-0">
      {isConversationStarted ? (
        <ChatConversationView
          messages={messages}
          message={message}
          sessionId={sessionId}
          sessionTitle={sessionTitle}
          onMessageChange={setMessage}
          onSend={handleSend}
          onReset={handleReset}
          onStop={handleStop}
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
      </div>

      {/* Thread Panel - Grok-style embedded side panel */}
      <ThreadPanel
        sessionId={sessionId}
        panelWidth={threadPanelWidth}
        onResize={setThreadPanelWidth}
      />

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
