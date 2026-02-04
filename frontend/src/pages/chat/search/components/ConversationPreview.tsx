/**
 * ConversationPreview — Preview pane for search results
 *
 * Displays a glimpse of the conversation content when a search result is selected.
 * Uses a simplified message rendering to avoid overhead.
 */

import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
    queryKey: ["chat-messages", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      return await ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(sessionId, 20);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (!sessionId) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center text-zinc-500", className)}>
        <MessageSquare className="size-12 mb-4 opacity-20" />
        <p className="text-sm">Select a conversation to preview</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <Loader2 className="size-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center text-red-400", className)}>
        <AlertCircle className="size-8 mb-2" />
        <p className="text-sm">Failed to load preview</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center text-zinc-500", className)}>
        <p className="text-sm">No messages in this conversation</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full pr-4", className)}>
      <div className="space-y-6 py-4">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  msg.role === "user" ? "text-cyan-400" : "text-purple-400"
                )}
              >
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
              <span className="text-[10px] text-zinc-600">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div
              className={cn(
                "text-sm prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10",
                "text-zinc-300"
              )}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
