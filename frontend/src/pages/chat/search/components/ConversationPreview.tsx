/**
 * ConversationPreview — Preview pane for search results
 *
 * Renders messages in the SAME layout as the main chat:
 * - User messages: right-aligned, warm sand bubble (bg-secondary)
 * - AI messages: left-aligned, borderless, full MarkdownRenderer
 *
 * Uses the shared rendering pipeline — no re-invented wheel.
 */

import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare, AlertCircle } from "lucide-react";

import { MarkdownRenderer } from "@/shared/rendering/MarkdownRenderer";
import { ChatService, type ChatMessageResponse } from "@/api/generated";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationPreviewProps {
  sessionId: number | null;
  highlightedQuery?: string;
  className?: string;
}



export function ConversationPreview({
  sessionId,
  highlightedQuery: _highlightedQuery,
  className,
}: ConversationPreviewProps) {
  const { data: messages = [], isLoading, error } = useQuery<ChatMessageResponse[]>({
    queryKey: ["chat-preview-messages", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      return await ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(sessionId, 50);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5,
  });

  if (!sessionId) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center text-muted-foreground", className)}>
        <MessageSquare className="size-12 mb-4 opacity-20" />
        <p className="text-sm">Select a conversation to preview</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <Loader2 className="size-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center text-destructive", className)}>
        <AlertCircle className="size-8 mb-2" />
        <p className="text-sm">Failed to load preview</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center text-muted-foreground", className)}>
        <p className="text-sm">No messages in this conversation</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full overflow-x-hidden", className)}>
      <div className="flex flex-col gap-5 py-5 px-4 overflow-hidden">
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-full gap-2",
                isUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Message bubble */}
              <div
                className={cn(
                  "flex flex-col gap-1 min-w-0",
                  isUser ? "items-end max-w-[75%]" : "items-start max-w-full"
                )}
              >
                <div
                  className={cn(
                    "overflow-hidden min-w-0 max-w-full",
                    isUser
                      ? "rounded-2xl rounded-br-sm px-4 py-2.5 bg-secondary text-secondary-foreground"
                      : "px-1 py-2 text-foreground/70"
                  )}
                  style={{
                    wordBreak: "break-word",
                  }}
                >
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="text-sm w-full min-w-0 overflow-hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:overflow-x-auto [&_table]:max-w-full [&_img]:max-w-full">
                      <MarkdownRenderer
                        content={msg.content || ""}
                        className="break-words"
                      />
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
