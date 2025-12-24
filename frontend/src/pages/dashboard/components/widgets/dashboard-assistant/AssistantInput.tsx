/**
 * AssistantInput - Input area for Dashboard Assistant
 * 
 * Uses the same input styling as the main chat page.
 */

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AssistantInputProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
    placeholder?: string;
    className?: string;
}

export function AssistantInput({
    onSend,
    disabled = false,
    isLoading = false,
    placeholder = "Ask about your progress...",
    className,
}: AssistantInputProps) {
    const [input, setInput] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || disabled || isLoading) return;
        onSend(input.trim());
        setInput("");
    };

    const canSend = input.trim() && !disabled && !isLoading;

    return (
        <div className={cn("p-4 bg-background border-t border-border/50", className)}>
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
                <Input
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className={cn(
                        "h-10 rounded-xl pl-4 pr-12",
                        "bg-muted/50 border-border/50",
                        "text-foreground placeholder:text-muted-foreground/50",
                        "focus-visible:bg-background focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30",
                        "transition-all font-light text-sm",
                    )}
                    disabled={disabled}
                />
                <Button
                    type="submit"
                    size="icon"
                    className={cn(
                        "absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg transition-all duration-300",
                        canSend
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground opacity-50",
                    )}
                    variant="ghost"
                    disabled={!canSend}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    );
}

export default AssistantInput;
