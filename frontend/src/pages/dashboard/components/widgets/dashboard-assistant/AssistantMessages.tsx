/**
 * AssistantMessages - Message display area with streaming
 * 
 * Shows messages with streaming support using shared ChatMessage component.
 * Matches main chat page styling with Synapse neural theme.
 */

import { useEffect, useRef } from "react";
import { BrainCircuit, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/modules/chat";
import { cn } from "@/lib/utils";
import type { ChatMessageResponse } from "@/api/generated";
import { MessageRole } from "@/api/generated";

interface AssistantMessagesProps {
    messages: ChatMessageResponse[];
    isTyping: boolean;
    streamingContent?: string;
    onDeleteMessage?: (messageId: number) => void;
    className?: string;
}

/**
 * Welcome message displayed at the start
 */
const WELCOME_MESSAGE: ChatMessageResponse = {
    id: -1,
    session_id: 0,
    role: MessageRole.ASSISTANT,
    content: "Hello! I'm your Synapse neural assistant. I can help you identify weak areas, suggest study topics, and track your learning progress. What would you like to explore?",
    tokens: 0,
    model_used: null,
    function_calls: null,
    grounding_sources: null,
    created_at: new Date().toISOString(),
};

export function AssistantMessages({
    messages,
    isTyping,
    streamingContent,
    onDeleteMessage,
    className,
}: AssistantMessagesProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages, isTyping, streamingContent]);

    // Combine welcome message with actual messages
    const allMessages = [WELCOME_MESSAGE, ...messages];

    return (
        <div className={cn("flex-1 flex flex-col overflow-hidden relative", className)}>
            <ScrollArea className="flex-1 p-4 pr-5 h-full w-full" ref={containerRef}>
                <div className="space-y-4 pb-4">
                    {allMessages.map((msg) => (
                        <div key={msg.id} className="group relative">
                            <ChatMessage
                                message={msg}
                                compact
                            />
                            {/* Delete button for user messages (not welcome message) */}
                            {msg.id > 0 && msg.role === MessageRole.USER && onDeleteMessage && (
                                <button
                                    onClick={() => onDeleteMessage(msg.id)}
                                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                                    title="Delete message"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Streaming message - show in progress response */}
                    {streamingContent && (
                        <ChatMessage
                            message={{
                                id: -999,
                                session_id: 0,
                                role: MessageRole.ASSISTANT,
                                content: streamingContent,
                                tokens: 0,
                                model_used: null,
                                function_calls: null,
                                grounding_sources: null,
                                created_at: new Date().toISOString(),
                            }}
                            compact
                            isStreaming
                        />
                    )}

                    {/* Typing indicator with BrainCircuit */}
                    {isTyping && !streamingContent && (
                        <div className="flex w-full gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <BrainCircuit className="h-3.5 w-3.5 text-primary animate-pulse" />
                            </div>
                            <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5 h-[34px]">
                                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}

                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
    );
}

export default AssistantMessages;
