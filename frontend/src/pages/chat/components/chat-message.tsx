import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Loader2 } from "lucide-react";

import type { ChatMessageResponse } from "@/api/generated";

interface ChatMessageProps {
  message: ChatMessageResponse;
  isStreaming?: boolean;
  thinking?: string;
}

export function ChatMessage({ message, isStreaming = false, thinking = "" }: ChatMessageProps) {
  const isUser = message.role === "user";
  const BotIcon = Logo; // Using Logo as Bot Icon

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
          isUser ? "bg-primary/10 border-primary/20" : "bg-card border-border",
        )}
      >
        {isUser ? (
          <div className="h-4 w-4 rounded-full bg-primary/50" />
        ) : (
          <BotIcon className="h-5 w-5 text-primary p-0.5" />
        )}
      </div>

      {/* Message Bubble (Card Style) */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        {/* Thinking indicator */}
        {thinking && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 rounded-full mb-1">
            <Loader2 className="size-3 animate-spin" />
            <span className="opacity-70">Thinking...</span>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm shadow-sm border",
            isUser
              ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-sm"
              : "bg-card border-border/50 text-foreground/90 rounded-tl-sm",
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
            {/* Streaming cursor */}
            {isStreaming && !isUser && (
              <span className="inline-block ml-1 w-[2px] h-4 bg-primary animate-pulse" />
            )}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground px-1 opacity-50">
          {message.created_at
            ? new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "Just now"}
        </span>
      </div>
    </div>
  );
}
