/**
 * AssistantMessages - Message list and typing indicator
 */

import { useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAssistantMessages, useAssistantTyping, type UIMessage } from "../state";
import { ActionsList } from "./ActionResultCard";

function MessageBubble({ msg }: { msg: UIMessage }) {
    return (
        <div
            className={cn(
                "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div
                className={cn(
                    "h-8 w-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center shrink-0",
                    msg.role === "user" ? "text-muted-foreground" : "text-primary"
                )}
            >
                {msg.role === "user" ? (
                    <div className="h-2 w-2 rounded-full bg-slate-500" />
                ) : (
                    <Bot className="h-4 w-4" />
                )}
            </div>

            <div
                className={cn(
                    "flex flex-col gap-1 max-w-[85%]",
                    msg.role === "user" ? "items-end" : "items-start"
                )}
            >
                <div
                    className={cn(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm",
                        msg.role === "user"
                            ? "bg-secondary border border-border text-secondary-foreground rounded-tr-sm"
                            : "bg-muted/30 border border-border text-foreground/80 rounded-tl-sm"
                    )}
                >
                    {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono px-1">
                    {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "Just now"}
                </span>

                {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
                    <ActionsList actions={msg.actions} className="mt-2 w-full" />
                )}
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="h-8 w-8 rounded-lg bg-muted border border-border rounded-lg flex items-center justify-center shrink-0 text-primary">
                <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted/30 border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 h-[46px]">
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
            </div>
        </div>
    );
}

export function AssistantMessages() {
    const messages = useAssistantMessages();
    const isTyping = useAssistantTyping();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col p-0 overflow-hidden relative">
            <ScrollArea className="flex-1 p-4 pr-5 h-full w-full">
                <div className="space-y-6 pb-20">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))}

                    {isTyping && <TypingIndicator />}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Gradient Fade */}
            <div className="absolute bottom-[72px] left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
    );
}
