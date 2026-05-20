import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TypingIndicator } from "./StreamingMessage";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { Bot, User, Copy, Check, Brain, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { ChatMessageResponse } from "@/api/generated";
import { MarkdownRenderer } from "@/shared/rendering/MarkdownRenderer";

/**
 * Enhanced MessageList Component
 *
 * Improvements:
 * - Glassmorphism UI
 * - Thinking/Reasoning support
 * - Synapse Design System integration
 */

interface MessageListProps {
  messages: ChatMessageResponse[];
  streamingContent?: string;
  isStreaming?: boolean;
  isLoading?: boolean;
  isTyping?: boolean;
  userName?: string;
  className?: string;
  emptyState?: React.ReactNode;
}

interface MessageItemProps {
  message: ChatMessageResponse;
  userName?: string;
  isStreaming?: boolean;
  index?: number;
}

const MessageItem = React.memo(function MessageItem({
  message,
  userName,
  isStreaming = false,
  index = 0,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast({ title: "Copied to clipboard", duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      className={cn(
        "flex gap-4 group",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: index * 0.05 + 0.1,
          type: "spring",
          stiffness: 200,
        }}
      >
        <Avatar
          className={cn(
            "h-8 w-8 shrink-0 ring-2 ring-background",
            isUser && "bg-primary",
          )}
        >
          <AvatarFallback
            className={cn(isUser && "bg-primary text-primary-foreground")}
          >
            {isUser ? (
              userName ? (
                getInitials(userName, 1)
              ) : (
                <User className="h-4 w-4" />
              )
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col gap-1.5 max-w-[80%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-xl px-5 py-3.5",
            isUser
              ? "bg-white/8 text-foreground"
              : "text-[var(--synapse-text-primary)]",
          )}
        >
          {/* Thinking Process (Enhanced) */}
          {message.model_used === "deepseek-reasoner" && (
            <div className="mb-4 rounded-xl bg-card/50 border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-foreground/5 border-b border-border text-[10px] text-[var(--synapse-cyan)] uppercase tracking-wider font-bold">
                <Brain className="h-3 w-3" />
                <span>Neural Processing</span>
              </div>
              <div className="p-3 text-xs text-[var(--synapse-text-tertiary)] italic font-mono leading-relaxed opacity-80">
                Analyzed user query context. Accessing vector database for
                relevant memories...
              </div>
            </div>
          )}

          {isStreaming && !isUser ? (
            <div className="text-[15px] leading-7 font-normal text-[var(--synapse-text-primary)]">
              <MarkdownRenderer content={message.content} className="!my-0" />
              <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 align-middle animate-pulse" />
            </div>
          ) : (
            <MarkdownRenderer 
              content={message.content} 
              className="text-[15px] leading-7 font-normal text-[var(--synapse-text-primary)] !my-0"
            />
          )}
        </div>

        {/* Message metadata */}
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isUser && "flex-row-reverse",
          )}
        >
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.created_at)}
          </span>

          {/* Message actions (visible on hover) */}
          {!isUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ opacity: 1, scale: 1 }}
              className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-accent-olive" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Add to Note"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

function MessageSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming = false,
  isLoading = false,
  isTyping = false,
  userName,
  className,
  emptyState,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingContent, isStreaming]);

  if (isLoading) {
    return (
      <ScrollArea className={cn("flex-1 p-4", className)}>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <MessageSkeleton key={i} />
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (messages.length === 0 && !streamingContent && !isTyping) {
    return (
      <div
        className={cn("flex flex-1 items-center justify-center p-4", className)}
      >
        {emptyState || (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-lg mx-auto"
          >
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-[var(--synapse-cyan)]/20 blur-xl rounded-full animate-pulse" />
              <div className="relative bg-background/70 border border-border p-5 rounded-2xl shadow-2xl backdrop-blur-sm ring-1 ring-white/5">
                <Bot
                  className="w-full h-full text-[var(--synapse-cyan)]"
                  strokeWidth={1.5}
                />
              </div>
              {/* Decorative dots */}
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-[var(--synapse-cyan)] rounded-full animate-bounce delay-100" />
              <div className="absolute -bottom-1 -left-2 w-2 h-2 bg-accent-olive rounded-full animate-bounce delay-300" />
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              How can I help you learn?
            </h3>
            <p className="text-[var(--synapse-text-secondary)] leading-relaxed max-w-sm mx-auto mb-8">
              I can analyze your documents, create quizzes, generate flashcards,
              or just chat about complex topics.
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
      <div className="space-y-8 p-6">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              userName={userName}
              isStreaming={
                isStreaming &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
              index={index}
            />
          ))}

          {/* Streaming response */}
          {isStreaming && streamingContent && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2 shadow-sm">
                <div className="text-[15px] leading-7">
                  <MarkdownRenderer content={streamingContent} className="!my-0" />
                  <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 align-middle animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Typing indicator */}
          {isTyping && !isStreaming && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl bg-muted px-4 py-3 shadow-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

export default MessageList;
