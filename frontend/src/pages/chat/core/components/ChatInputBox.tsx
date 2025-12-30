/**
 * ChatInputBox - Minimalist Modern Design
 *
 * Single-layer design with inline actions
 * Glassmorphism effect using custom GlassCard
 */

import { PaperclipIcon, SendIcon, Mic, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import GlassCard from "@/components/ui/GlassCard";
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
  placeholder = "Message Synapse...",
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
    <GlassCard
      className={cn(
        "rounded-[26px] p-2 transition-all duration-300 ease-in-out",
        "bg-zinc-900/80 backdrop-blur-md border-white/5",
        isFocused ? "shadow-lg border-white/10 ring-1 ring-white/5" : "shadow-md",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        {/* Text Input Area */}
        <Textarea
          placeholder={placeholder}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={cn(
            "min-h-[40px] max-h-[300px] resize-none",
            "border-0 bg-transparent px-4 py-2",
            "text-base placeholder:text-zinc-500",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "leading-relaxed w-full custom-scrollbar",
          )}
          rows={1}
          style={{ height: 'auto', overflowY: 'hidden' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            const newHeight = Math.min(target.scrollHeight, 300);
            target.style.height = `${newHeight}px`;
            target.style.overflowY = target.scrollHeight > 300 ? 'auto' : 'hidden';
          }}
        />

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-2 pb-1">
          {/* Left: DeepSeek-style Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 rounded-full border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700/50 hover:border-cyan-500/30 transition-all font-medium text-xs gap-1.5 px-3",
              )}
            >
              <Sparkles className="size-3.5" />
              <span>DeepThink</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 gap-1.5 px-3 text-xs font-medium"
            >
              <Search className="size-3.5" />
              <span>Search</span>
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/5"
              type="button"
              disabled={disabled}
            >
              <PaperclipIcon className="size-4" />
            </Button>

            {onVoiceClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoiceClick}
                className="size-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/5"
                type="button"
                disabled={disabled}
              >
                <Mic className="size-4" />
              </Button>
            )}

            <Button
              size="icon"
              onClick={onSend}
              disabled={!message.trim() || disabled}
              className={cn(
                "size-8 rounded-full transition-all duration-300 ml-1",
                message.trim() && !disabled
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "bg-zinc-800 text-zinc-600 hover:bg-zinc-800"
              )}
              type="button"
            >
              <SendIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
