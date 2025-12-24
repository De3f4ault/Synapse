/**
 * ChatInputBox - Minimalist Modern Design
 *
 * Single-layer design with inline actions
 * Glassmorphism effect and gradient border on focus
 */

import { PaperclipIcon, SendIcon, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ChatInputBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onVoiceClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInputBox({
  message,
  onMessageChange,
  onSend,
  onVoiceClick,
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
        "relative rounded-3xl transition-all duration-300 ease-in-out",
        "bg-muted/50 backdrop-blur-sm",
        "border shadow-sm",
        isFocused
          ? "bg-background border-primary/30 ring-4 ring-primary/10 shadow-lg"
          : "border-transparent shadow-inner hover:bg-muted/70",
        className,
      )}
    >
      <div className="flex items-end gap-2 p-2">
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
            "border-0 bg-transparent px-4 py-3",
            "text-sm placeholder:text-muted-foreground/50",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "leading-relaxed flex-1",
          )}
          rows={1}
        />

        {/* Actions Container */}
        <div className="flex items-center gap-1 pb-1 pr-1">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            type="button"
            disabled={disabled}
          >
            <PaperclipIcon className="size-4" />
          </Button>

          {/* Voice Mode Button */}
          {onVoiceClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceClick}
              className="size-8 shrink-0 rounded-full hover:bg-purple-500/10 hover:text-purple-500 transition-colors"
              type="button"
              disabled={disabled}
              title="Voice Mode"
            >
              <Mic className="size-4" />
            </Button>
          )}

          {/* Send Button */}
          <Button
            size="icon"
            onClick={onSend}
            disabled={!message.trim() || disabled}
            className={cn(
              "size-8 shrink-0 rounded-full shadow-sm",
              "transition-all duration-300",
              message.trim() && !disabled
                ? "bg-primary text-primary-foreground scale-100 hover:bg-primary/90"
                : "bg-muted text-muted-foreground scale-90 opacity-50",
            )}
            type="button"
          >
            <SendIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
