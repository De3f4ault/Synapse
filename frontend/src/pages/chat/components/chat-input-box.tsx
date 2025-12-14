/**
 * ChatInputBox - Minimalist Modern Design
 * 
 * Single-layer design with inline actions
 * Glassmorphism effect and gradient border on focus
 */

import { PaperclipIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ChatInputBoxProps {
    message: string;
    onMessageChange: (value: string) => void;
    onSend: () => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function ChatInputBox({
    message,
    onMessageChange,
    onSend,
    placeholder = "Type your message...",
    disabled = false,
    className,
}: ChatInputBoxProps) {
    const [isFocused, setIsFocused] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (message.trim() && !disabled) {
                onSend();
            }
        }
    };

    return (
        <div
            className={cn(
                "relative rounded-xl transition-all duration-200",
                "bg-secondary/50 dark:bg-card/50 backdrop-blur-sm",
                "border-2",
                isFocused
                    ? "border-primary/50 shadow-lg shadow-primary/10"
                    : "border-border",
                className
            )}
        >
            <div className="flex items-end gap-2 p-3">
                {/* Attachment Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 self-end mb-0.5 rounded-lg hover:bg-accent"
                    type="button"
                    disabled={disabled}
                >
                    <PaperclipIcon className="size-4 text-muted-foreground" />
                </Button>

                {/* Text Input */}
                <Textarea
                    placeholder={placeholder}
                    value={message}
                    onChange={(e) => onMessageChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    className={cn(
                        "min-h-[44px] max-h-[200px] resize-none",
                        "border-0 bg-transparent px-0 py-2.5",
                        "text-base placeholder:text-muted-foreground/50",
                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                        "leading-relaxed"
                    )}
                    rows={1}
                />

                {/* Send Button */}
                <Button
                    size="icon"
                    onClick={onSend}
                    disabled={!message.trim() || disabled}
                    className={cn(
                        "size-9 shrink-0 self-end mb-0.5 rounded-lg",
                        "transition-all duration-200",
                        message.trim() && !disabled
                            ? "bg-primary hover:bg-primary/90 shadow-md"
                            : "bg-muted"
                    )}
                    type="button"
                >
                    <SendIcon className="size-4" />
                </Button>
            </div>
        </div>
    );
}
