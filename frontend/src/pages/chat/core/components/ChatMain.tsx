/**
 * ChatMain — Chat orchestrator.
 *
 * Pure Vercel architecture: SDK `messages` is the ONLY source of truth.
 * No manual streaming state. No prop-drilling of streamingContent/streamingThinking.
 */

import { useState, useEffect, useCallback } from "react";
import { ChatWelcomeScreen } from "./ChatWelcomeScreen";
import { ChatConversationView } from "./ChatConversationView";
import { ThreadPanel } from "./ThreadPanel";
import { useChatMessages, useInvalidateMessages } from "../hooks/useChatMessages";
import { useSynapseChat } from "../hooks/useSynapseChat";
import { useImplicitFeedback } from "@/modules/chat/hooks/useImplicitFeedback";
import { useAuthStore } from "@/stores/authStore";
import { useTTSAutoRead } from "@/platform/audio/hooks/useTTSAutoRead";
import { useThreadStore } from "../state/threadStore";
import { useLiveVoice } from "../../voice/hooks/useLiveVoice";
import { getAuthToken } from "@/api/client";

interface ChatMainProps {
  sessionId: number;
  sessionTitle?: string;
}

export function ChatMain({ sessionId, sessionTitle }: ChatMainProps) {
  const [message, setMessage] = useState("");
  const [threadPanelWidth, setThreadPanelWidth] = useState(384);

  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? 0;

  // Reset thread state on session change
  const resetThreadStore = useThreadStore((state) => state.reset);
  useEffect(() => { resetThreadStore(); }, [sessionId, resetThreadStore]);

  // DB messages — used only as initial seed for the SDK; never drives rendering
  const { data: dbMessages = [], isLoading } = useChatMessages(sessionId);
  const invalidateMessages = useInvalidateMessages(sessionId);

  // Implicit feedback telemetry (needs DB messages for history)
  useImplicitFeedback(sessionId, dbMessages, userId);

  // SDK streaming — owns ALL message state after initial seed
  const { messages, sendMessage: sendStreamingMessage, stop, status } = useSynapseChat({
    sessionId,
    initialMessages: dbMessages,
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  // TTS reads the last assistant text part when streaming completes
  const lastAssistantText = (() => {
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (!last?.parts) return '';
    return last.parts.filter(p => p.type === 'text').map(p => (p as any).text).join('');
  })();

  useTTSAutoRead({ enabled: true, content: lastAssistantText, isStreaming });

  // Voice mode (Gemini Live-style inline)
  const voice = useLiveVoice({
    sessionId,
    systemInstruction: "You are Synapse, a helpful AI learning assistant.",
    enableSearch: true,
    onMessagesSaved: () => { invalidateMessages(); },
  });

  const handleVoiceToggle = useCallback(() => {
    voice.isActive ? voice.endSession() : voice.startSession();
  }, [voice.isActive, voice.endSession, voice.startSession]);

  const handleSend = (attachmentIds?: number[]) => {
    if (!message.trim() && !(attachmentIds?.length)) return;

    if (voice.isActive) {
      voice.sendText(message);
      setMessage("");
      return;
    }

    // Fire-and-forget: patch user caption onto each image attachment so the
    // typed message becomes retrievable context alongside the LLM-generated caption.
    // Only fires when there are attachments AND a non-empty message.
    if (attachmentIds?.length && message.trim()) {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const token = getAuthToken();
      attachmentIds.forEach((docId) => {
        fetch(`${API_BASE}/api/v1/chat/attachments/${docId}/caption`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ caption: message.trim() }),
          credentials: "include",
        }).catch((err) => {
          // Non-fatal — LLM caption is the primary signal, user caption is supplementary
          console.warn("[ChatMain] Caption patch failed:", err);
        });
      });
    }

    try {
      sendStreamingMessage(message || "What is this?", { attachmentIds });
      setMessage("");
    } catch (error) {
      console.error("[ChatMain] Failed to send message:", error);
    }
  };

  const handleStop = () => {
    voice.isActive ? voice.endSession() : stop();
  };

  // Conversation has started if SDK has any messages (covers both DB-seeded and new)
  const isConversationStarted = messages.length > 0 || voice.isActive;

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
            onReset={() => setMessage("")}
            onStop={handleStop}
            onVoiceClick={handleVoiceToggle}
            isStreaming={isStreaming}
            // Voice mode props
            voiceActive={voice.isActive}
            voiceState={voice.state}
            voiceInputTranscript={voice.inputTranscript}
            voiceOutputTranscript={voice.outputTranscript}
            voiceAudioLevel={voice.audioLevel}
            voiceTranscriptHistory={voice.transcriptHistory}
            onVoiceInterrupt={voice.interrupt}
            onVoiceEndSession={voice.endSession}
          />
        ) : (
          <ChatWelcomeScreen
            message={message}
            onMessageChange={setMessage}
            onSend={handleSend}
            onVoiceClick={handleVoiceToggle}
          />
        )}
      </div>

      <ThreadPanel
        sessionId={sessionId}
        panelWidth={threadPanelWidth}
        onResize={setThreadPanelWidth}
      />
    </div>
  );
}
