/**
 * ChatInputBox - Minimalist Modern Design
 *
 * Single-layer design with inline actions
 * Glassmorphism effect using custom GlassCard
 */

import { PaperclipIcon, SendIcon, Mic, Search, GraduationCap, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/shared/ui";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useMentionController, EntityPicker } from "@/shared/platform/mentions";
import { useEntitySearch } from "@/shared/platform/hooks/useEntitySearch";
import type { EntitySearchResult } from "@/shared/platform/types";
import { useChatMode, useToggleChatMode } from "../state/chatSelectors";

/**
 * Mode Toggle Button - Switches between Tutor and General mode
 */
function ModeToggleButton() {
  const chatMode = useChatMode();
  const toggleMode = useToggleChatMode();

  const isTutor = chatMode === 'tutor';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleMode}
      className={cn(
        "h-8 rounded-full border-zinc-700/50 bg-zinc-800/50 transition-all font-medium text-xs gap-1.5 px-3",
        isTutor
          ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30"
          : "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/30"
      )}
      title={isTutor ? "Tutor Mode: Guides you with questions" : "Direct Mode: Straightforward answers"}
    >
      {isTutor ? (
        <>
          <GraduationCap className="size-3.5" />
          <span>Tutor</span>
        </>
      ) : (
        <>
          <MessageCircle className="size-3.5" />
          <span>Direct</span>
        </>
      )}
    </Button>
  );
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea when message changes (e.g. cleared externally)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset to auto to correctly calculate new scrollHeight (shrink if needed)
      textarea.style.height = 'auto';
      
      // Calculate new height based on content
      const newHeight = Math.min(textarea.scrollHeight, 300);
      
      // Apply new height
      textarea.style.height = `${newHeight}px`;
      
      // Handle scrolling if max height reached
      textarea.style.overflowY = textarea.scrollHeight > 300 ? 'auto' : 'hidden';
    }
  }, [message]);

  // Mention System
  const handleSelectEntity = (entity: EntitySearchResult) => {
    if (!textareaRef.current) return;

    const input = textareaRef.current;
    const value = input.value;
    const selectionEnd = input.selectionEnd;

    // Find the @ before the cursor
    const lastAtPos = value.lastIndexOf("@", selectionEnd - 1);
    if (lastAtPos !== -1) {
      const beforeAt = value.substring(0, lastAtPos);
      const afterCursor = value.substring(selectionEnd);
      // Insert markdown-style mention: @[Title](entity:type:id)
      // This is a robust way to store reference.
      // Display layer will parse this.
      const mentionText = `@[${entity.title}](entity:${entity.type}:${entity.id}) `;

      const newValue = beforeAt + mentionText + afterCursor;
      onMessageChange(newValue);

      // Restore cursor position after insertion (tick later to allow render)
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(lastAtPos + mentionText.length, lastAtPos + mentionText.length);
      }, 0);
    }
  };

  // Local state for query to break dependency cycle
  const [mentionQueryState, setMentionQueryState] = useState("");

  // Fetch results based on local state
  const { data: searchResults = [], isLoading: isSearching } = useEntitySearch(mentionQueryState, {
    enabled: mentionQueryState.length > 0, // Optimization: only fetch if query exists
    limit: 5,
  });

  const {
    isPickerOpen: showPicker,
    activeIndex: activeIdx,
    openPicker: triggerPicker,
    closePicker: dismissPicker,
    setQuery: updateQuery,
    handleKeyDown: onPermissionKeyDown,
  } = useMentionController({
    onSelect: handleSelectEntity,
    onClose: () => setMentionQueryState(""),
  }, searchResults);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Give priority to mention controller
    if (showPicker) {
      const handled = onPermissionKeyDown(e);
      if (handled) return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !disabled) {
        onSend();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onMessageChange(newValue);

    // Check for trigger
    const selectionEnd = e.target.selectionEnd;
    const lastAt = newValue.lastIndexOf("@", selectionEnd - 1);

    if (lastAt !== -1) {
      // Text from @ to cursor
      const fragment = newValue.substring(lastAt + 1, selectionEnd);
      // regex to ensure no spaces (simple mentions) or just typical restrictions
      // syncing with Slack/IDE style: user types @...
      // If there's a space, we might stop referencing unless we support multi-word search
      // My search supports it. But usually we stop if there's a newline or too far back.
      if (!fragment.includes("\n") && fragment.length < 50) {
        if (!showPicker) triggerPicker(fragment);
        updateQuery(fragment); // Always update the controller's query
        setMentionQueryState(fragment); // Update local state for search
        return;
      }
    }
    if (showPicker) dismissPicker();
  };

  return (
    <GlassCard
      className={cn(
        "rounded-[26px] p-2 transition-all duration-300 ease-in-out relative",
        "bg-zinc-900/80 backdrop-blur-md border-white/5",
        isFocused ? "shadow-lg border-white/10 ring-1 ring-white/5" : "shadow-md",
        className
      )}
    >
      {/* Entity Picker Floating */}
      {showPicker && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <EntityPicker
            results={searchResults}
            activeIndex={activeIdx}
            onSelect={handleSelectEntity}
            isLoading={isSearching}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Text Input Area */}
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={message}
          onChange={handleChange}
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
          {/* Left: Mode Toggle & Search */}
          <div className="flex items-center gap-2">
            <ModeToggleButton />

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
