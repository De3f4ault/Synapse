import { memo } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Loader2 } from "lucide-react";
import { HighlightedText } from "../../search/components/HighlightedText";
import { MarkdownRenderer } from "@/shared/rendering";
import { MermaidBlock } from "@/shared/rendering/components/MermaidBlock";
import { parseOutput } from "../engine/parseOutput";
import { ChatEntityPreview } from "./ChatEntityPreview";
import { MentionChip } from "./MentionChip";
import { entityKey } from "@/shared/core/entity";

import type { ChatMessageResponse } from "@/api/generated";
import type { SearchOccurrence } from "../../search/types";

import type { EntityIdentity } from "@/shared/core/entity";

interface ChatMessageProps {
  message: ChatMessageResponse & { entities?: EntityIdentity[] };
  isStreaming?: boolean;
  thinking?: string;
  occurrences?: SearchOccurrence[];
  currentOccurrenceId?: string | null;
}

const ChatMessageComponent = ({
  message,
  isStreaming = false,
  thinking = "",
  occurrences = [],
  currentOccurrenceId = null,
}: ChatMessageProps) => {
  const isUser = message.role === "user";
  const BotIcon = Logo;

  // Filter occurrences for this message's first block (simplified)
  // In full implementation, would parse blocks and distribute occurrences
  const hasHighlights = occurrences.length > 0;

  // Render content based on message type
  const renderContent = () => {
    const content = message.content || "";

    // User messages: plain text with optional highlighting
    if (isUser) {
      // Basic Mention Parsing
      // Regex: @\[([^\]]+)\]\(entity:([^:]+):([^)]+)\)
      // Matches @[Title](entity:type:id)
      const parts = [];
      let lastIndex = 0;
      const mentionRegex = /@\[([^\]]+)\]\(entity:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\)/g;

      let match;
      const textContent = content; // Assuming content is string

      while ((match = mentionRegex.exec(textContent)) !== null) {
        if (match.index > lastIndex) {
          parts.push(textContent.substring(lastIndex, match.index));
        }
        parts.push({
          isMention: true,
          title: match[1],
          type: match[2],
          id: match[3],
          matchText: match[0]
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < textContent.length) {
        parts.push(textContent.substring(lastIndex));
      }

      // Check for search highlights in text parts only? 
      // This is getting complex: HighlightedText needs full string or segment.
      // If we have search highlights, mixing with mentions is tricky.
      // Search logic typically operates on plain text. If mentions are raw markdown, search finds matches in raw text.
      // But we want to render mentions as chips. 
      // Simpler approach: If mentions exist, render chips. If highlights exist, render highlights on clean text?
      // For now, let's prioritize Mention rendering over Search highlights if both exist, 
      // or just apply highlighting to the text nodes.

      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (typeof part === 'string') {
              // Fallback to simple string
              return <span key={i}>{part}</span>;
            } else {
              return (
                <MentionChip
                  key={i}
                  title={part.title || ""}
                  type={part.type as any}
                  id={part.id || ""}
                />
              );
            }
          })}
        </p>
      );
    }

    // AI messages: rich markdown rendering
    // TODO: When search highlighting is needed for markdown,
    // implement block-level highlighting in MarkdownRenderer
    // AI messages: block-based rendering (Engine)
    // If we have search highlights, we fall back to simple text for now (TODO: block-level highlighting)
    if (hasHighlights) {
      return (
        <div className="text-sm leading-relaxed">
          <HighlightedText
            content={content}
            occurrences={occurrences}
            currentOccurrenceId={currentOccurrenceId}
          />
        </div>
      );
    }

    // Engine: Parse content into blocks
    // Note: We're calling parsing inside render. Ideally memoized, but component is memoized.
    const blocks = parseOutput(content);

    return (
      <div className="text-sm w-full min-w-0 flex flex-col gap-4">
        {blocks.map((block, index) => {
          // Provide a unique key based on content and index to avoid re-render issues
          const key = `${block.type}-${index}`;

          switch (block.type) {
            case 'mermaid':
              return <MermaidBlock key={key} content={block.content} />;

            case 'code':
              // Reconstruct markdown for code blocks to maintain consistent styling via MarkdownRenderer
              return (
                <MarkdownRenderer key={key} content={`\`\`\`${block.language}\n${block.content}\n\`\`\``} />
              );

            case 'markdown':
              return <MarkdownRenderer key={key} content={block.content} className="break-words" />;

            default:
              // Other block types (Table, Citation, etc.) are not yet produced by parseOutput.
              // Handle them or return null to satisfy TypeScript.
              return null;
          }
        })}

        {/* Streaming cursor (appended to last block or strictly at bottom) */}
        {isStreaming && (
          <div className="h-4 w-1 bg-cyan-400 animate-pulse mt-1" />
        )}
      </div>
    );
  };

  return (
    <div
      data-message-id={message.id}
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
          <div className="size-8 rounded-full flex items-center justify-center p-0.5">
            <BotIcon className={cn("size-full", isStreaming && "text-cyan-400 animate-pulse")} />
          </div>
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
            "rounded-2xl px-4 py-3 shadow-sm border overflow-hidden min-w-0 transition-all duration-200",
            isUser
              ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-sm"
              : "bg-card border-border/50 text-foreground/90 rounded-tl-sm",
          )}
        >
          {renderContent()}

          {/* Referenced Entities */}
          {message.entities && message.entities.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">
                Referenced Context
              </span>
              {message.entities.map((ref) => (
                <ChatEntityPreview
                  key={entityKey(ref)}
                  entityRef={ref}
                />
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground px-1 opacity-50 flex items-center gap-1.5">
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
};

export const ChatMessage = memo(ChatMessageComponent, (prev, next) => {
  // Custom comparator to handle new array references for 'occurrences'
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.content !== next.message.content) return false;
  if (prev.isStreaming !== next.isStreaming) return false;
  if (prev.thinking !== next.thinking) return false;
  if (prev.currentOccurrenceId !== next.currentOccurrenceId) return false;

  // Check occurrences array content equality
  if (prev.occurrences === next.occurrences) return true;
  if (!prev.occurrences || !next.occurrences) return false;
  if (prev.occurrences.length !== next.occurrences.length) return false;

  // If lengths match, check simplified equality (usually IDs if available, or just assume mismatch if length matches and strict eq fails, but for search results, strict eq failing usually means user typed query, so re-render is fine. BUT when typing in chat input, filter() always returns new array even if search results didn't change.)
  // Wait, occurrences come from search state. If search query didn't change, occurrences content is same.
  // So if search state is stable, filter returns new array but SAME item references?
  // Let's check filter(). Yes, items are same references.
  // So we can check strict equality of first item.
  if (prev.occurrences.length > 0 && prev.occurrences[0] !== next.occurrences[0]) return false;

  return true;
});

