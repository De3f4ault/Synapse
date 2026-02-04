/**
 * ChatInputBox - Gemini-Style Modern Design
 *
 * Spacious, rounded input with integrated toolbar and actions
 */

import { PaperclipIcon, SendIcon, Mic, GraduationCap, MessageCircle, Square, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      className={cn(
        "h-7 rounded-lg transition-all font-medium text-xs gap-1.5 px-2.5",
        isTutor
          ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          : "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
      )}
      title={isTutor ? "Tutor Mode: Guides you with questions" : "Direct Mode: Straightforward answers"}
    >
      {isTutor ? (
        <>
          <GraduationCap className="size-3.5" />
          <span className="hidden sm:inline">Tutor</span>
        </>
      ) : (
        <>
          <MessageCircle className="size-3.5" />
          <span className="hidden sm:inline">Direct</span>
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
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInputBox({
  message,
  onMessageChange,
  onSend,
  onVoiceClick,
  onStop,
  isStreaming = false,
  placeholder = "Ask anything...",
  disabled = false,
  className,
}: ChatInputBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea when message changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [message]);

  // Mention System
  const handleSelectEntity = (entity: EntitySearchResult) => {
    if (!textareaRef.current) return;

    const input = textareaRef.current;
    const value = input.value;
    const selectionEnd = input.selectionEnd;

    const lastAtPos = value.lastIndexOf("@", selectionEnd - 1);
    if (lastAtPos !== -1) {
      const beforeAt = value.substring(0, lastAtPos);
      const afterCursor = value.substring(selectionEnd);
      const mentionText = `@[${entity.title}](entity:${entity.type}:${entity.id}) `;

      const newValue = beforeAt + mentionText + afterCursor;
      onMessageChange(newValue);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(lastAtPos + mentionText.length, lastAtPos + mentionText.length);
      }, 0);
    }
  };

  const [mentionQueryState, setMentionQueryState] = useState("");

  const { data: searchResults = [], isLoading: isSearching } = useEntitySearch(mentionQueryState, {
    enabled: mentionQueryState.length > 0,
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
    if (showPicker) {
      const handled = onPermissionKeyDown(e);
      if (handled) return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !disabled && !isStreaming) {
        onSend();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onMessageChange(newValue);

    const selectionEnd = e.target.selectionEnd;
    const lastAt = newValue.lastIndexOf("@", selectionEnd - 1);

    if (lastAt !== -1) {
      const fragment = newValue.substring(lastAt + 1, selectionEnd);
      if (!fragment.includes("\n") && fragment.length < 50) {
        if (!showPicker) triggerPicker(fragment);
        updateQuery(fragment);
        setMentionQueryState(fragment);
        return;
      }
    }
    if (showPicker) dismissPicker();
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-300 ease-out",
        // Gemini-style: rounded rectangle with generous padding
        "rounded-2xl overflow-hidden",
        "bg-zinc-900/90 backdrop-blur-sm",
        "border border-white/[0.08]",
        isFocused 
          ? "shadow-lg shadow-black/20 border-white/[0.15] ring-1 ring-white/[0.05]" 
          : "shadow-sm",
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

      {/* Main Input Area */}
      <div className="px-4 pt-3 pb-2">
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled || isStreaming}
          className={cn(
            "min-h-[24px] max-h-[200px] resize-none w-full",
            "border-0 bg-transparent p-0",
            "text-[15px] leading-relaxed placeholder:text-zinc-500",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "custom-scrollbar",
          )}
          rows={1}
          style={{ height: '24px', overflowY: 'hidden' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = '24px';
            const newHeight = Math.min(target.scrollHeight, 200);
            target.style.height = `${newHeight}px`;
            target.style.overflowY = target.scrollHeight > 200 ? 'auto' : 'hidden';
          }}
        />
      </div>

      {/* Bottom Toolbar */}
      <div className="flex items-center justify-between px-2 pb-2">
        {/* Left: Tools */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 gap-1.5 px-2"
            type="button"
            disabled={disabled}
          >
            <Plus className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 gap-1.5 px-2.5"
            type="button"
            disabled={disabled}
          >
            <Settings2 className="size-3.5" />
            <span className="text-xs">Tools</span>
          </Button>
        </div>

        {/* Right: Mode + Actions */}
        <div className="flex items-center gap-1">
          <ModeToggleButton />

          <div className="w-px h-4 bg-white/10 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
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
              className="size-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              type="button"
              disabled={disabled || isStreaming}
            >
              <Mic className="size-4" />
            </Button>
          )}

          {/* Stop/Send Button */}
          {isStreaming ? (
            <Button
              size="icon"
              onClick={onStop}
              className={cn(
                "size-8 rounded-lg transition-all duration-200",
                "bg-red-500/20 text-red-400 hover:bg-red-500/30",
                "border border-red-500/30"
              )}
              type="button"
              title="Stop generating"
            >
              <Square className="size-3.5" fill="currentColor" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={onSend}
              disabled={!message.trim() || disabled}
              className={cn(
                "size-8 rounded-lg transition-all duration-300",
                message.trim() && !disabled
                  ? "bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700/80"
              )}
              type="button"
            >
              <SendIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
