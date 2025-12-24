import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { ChatInputBox } from "./chat-input-box";
import type { ChatMessageResponse } from "@/api/generated";

interface ChatConversationViewProps {
  messages: ChatMessageResponse[];
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
  onVoiceClick?: () => void;
  isSending?: boolean;
}

export function ChatConversationView({
  messages,
  message,
  onMessageChange,
  onSend,
  onReset,
  onVoiceClick,
  isSending = false,
}: ChatConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-end mb-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={onReset}
              className="size-8 rounded-full border bg-background/50 hover:bg-background"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 md:px-8 pb-6 pt-2">
        <div className="max-w-4xl mx-auto">
          <ChatInputBox
            message={message}
            onMessageChange={onMessageChange}
            onSend={onSend}
            onVoiceClick={onVoiceClick}
            placeholder="Continue the conversation..."
            disabled={isSending}
          />
        </div>
      </div>
    </div>
  );
}
