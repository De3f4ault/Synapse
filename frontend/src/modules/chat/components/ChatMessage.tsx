/**
 * ChatMessage - Shared message bubble component
 * 
 * Used by both Chat Page and Dashboard Assistant.
 * Matches the glassmorphic styling of the main chat page.
 * 
 * Location: frontend/src/modules/chat/components/ChatMessage.tsx
 */

import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import type { ChatMessageResponse } from "@/api/generated";

interface ChatMessageProps {
    message: ChatMessageResponse;
    /** Optional className for customization */
    className?: string;
    /** Compact mode for widget contexts */
    compact?: boolean;
    /** Show streaming cursor animation */
    isStreaming?: boolean;
}

/**
 * Shared message component with consistent styling
 */
export function ChatMessage({
    message,
    className,
    compact = false,
    isStreaming = false,
}: ChatMessageProps) {
    const isUser = message.role === "user";
    const BotIcon = Logo;

    return (
        <div
            className={cn(
                "flex w-full gap-3",
                isUser ? "flex-row-reverse" : "flex-row",
                className,
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                    compact ? "h-6 w-6" : "h-8 w-8",
                    isUser ? "bg-primary/10 border-primary/20" : "bg-card border-border",
                )}
            >
                {isUser ? (
                    <div className={cn(
                        "rounded-full bg-primary/50",
                        compact ? "h-3 w-3" : "h-4 w-4",
                    )} />
                ) : (
                    <BotIcon className={cn(
                        "text-primary",
                        compact ? "h-4 w-4 p-0" : "h-5 w-5 p-0.5",
                    )} />
                )}
            </div>

            {/* Message Bubble */}
            <div
                className={cn(
                    "flex flex-col gap-1",
                    compact ? "max-w-[90%]" : "max-w-[80%]",
                    isUser ? "items-end" : "items-start",
                )}
            >
                <div
                    className={cn(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm border",
                        isUser
                            ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-sm"
                            : "bg-card border-border/50 text-foreground/90 rounded-tl-sm",
                        compact && "px-3 py-2 text-xs",
                    )}
                >
                    <p className={cn(
                        "leading-relaxed whitespace-pre-wrap",
                        compact ? "text-xs" : "text-sm",
                    )}>
                        {message.content}
                        {/* Streaming cursor */}
                        {isStreaming && !isUser && (
                            <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 align-middle animate-pulse" />
                        )}
                    </p>
                </div>
                <span className={cn(
                    "text-muted-foreground px-1 opacity-50",
                    compact ? "text-[8px]" : "text-[10px]",
                )}>
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

export default ChatMessage;
