/**
 * ChatInputBox - Modern Design with Mode & Model Dropdowns
 *
 * Features:
 * - 5 AI modes with dropdown selector (Direct, Tutor, Deep Think, Creative, Research)
 * - Model selector with provider grouping (DeepSeek-style)
 * - Search toggle
 * - Mention system (@entity support)
 */

import { 
  PaperclipIcon, 
  SendIcon, 
  Mic,
  Square, 
  Plus, 
  ChevronDown,
  Check,
  Zap,
  GraduationCap,
  Brain,
  Sparkles,
  Search,
  Cpu,
  Cloud,
  Volume2,
  Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useMentionController, EntityPicker } from "@/shared/platform/mentions";
import { useEntitySearch } from "@/shared/platform/hooks/useEntitySearch";
import type { EntitySearchResult } from "@/shared/platform/types";
import { useChatMode, useSetChatMode, useSelectedModel, useSetSelectedModel } from "../state/chatSelectors";
import { useChatStore } from "../state/chatStore";
import { useModels } from "../hooks/useModels";
import { motion, AnimatePresence } from "framer-motion";
import type { VoiceState } from "../../voice/engine/types";

// Mode definitions
interface Mode {
  id: 'direct' | 'tutor' | 'deep_think' | 'creative' | 'research';
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  hasThinking?: boolean;
}

const MODES: Mode[] = [
  {
    id: "direct",
    name: "Direct",
    icon: <Zap className="size-4" />,
    description: "Fast, concise responses",
    color: "text-amber-400",
  },
  {
    id: "tutor",
    name: "Tutor",
    icon: <GraduationCap className="size-4" />,
    description: "Socratic learning guidance",
    color: "text-blue-400",
  },
  {
    id: "deep_think",
    name: "Deep Think",
    icon: <Brain className="size-4" />,
    description: "Extended reasoning",
    color: "text-purple-400",
    hasThinking: true,
  },
  {
    id: "creative",
    name: "Creative",
    icon: <Sparkles className="size-4" />,
    description: "Imaginative exploration",
    color: "text-pink-400",
  },
  {
    id: "research",
    name: "Research",
    icon: <Search className="size-4" />,
    description: "In-depth analysis",
    color: "text-emerald-400",
  },
];

/**
 * Mode Selector Dropdown
 * Accepts optional mode/onModeChange for independent state (e.g. thread panel).
 * Falls back to global chatStore when not provided.
 */
function ModeSelector({
  mode: externalMode,
  onModeChange: externalOnModeChange,
}: {
  mode?: string;
  onModeChange?: (mode: string) => void;
} = {}) {
  const globalChatMode = useChatMode();
  const globalSetChatMode = useSetChatMode();

  // Use external props if provided, otherwise fall back to global store
  const chatMode = externalMode ?? globalChatMode;
  const setChatMode = externalOnModeChange ?? globalSetChatMode;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMode = MODES.find(m => m.id === chatMode) ?? MODES[1]!;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (mode: Mode) => {
    setChatMode(mode.id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-7 rounded-lg transition-all font-medium text-xs gap-1.5 px-2.5",
          "hover:bg-white/10",
          currentMode.color
        )}
        title={currentMode.description}
      >
        {currentMode.icon}
        <span className="hidden sm:inline">{currentMode.name}</span>
        <ChevronDown className={cn(
          "size-3 opacity-50 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-white/10 bg-zinc-900 p-1.5 shadow-2xl z-50"
          >
            <div className="text-[10px] uppercase tracking-wider text-white/40 px-2 py-1.5 mb-1">
              Select Mode
            </div>
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleSelect(mode)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                  mode.id === chatMode
                    ? "bg-white/10"
                    : "hover:bg-white/5",
                )}
              >
                <div className={cn("flex-shrink-0", mode.color)}>
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {mode.name}
                    </span>
                    {mode.hasThinking && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        Thinking
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 truncate">
                    {mode.description}
                  </p>
                </div>
                {mode.id === chatMode && (
                  <Check className="size-4 text-cyan-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/**
 * Model Selector Dropdown — DeepSeek-style
 * Shows available models grouped by provider with thinking capability badges.
 */
function ModelSelector() {
  const selectedModel = useSelectedModel();
  const setSelectedModel = useSetSelectedModel();
  const { models, isLoading } = useModels();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find current model info
  const currentModel = models.find(m => m.id === selectedModel);
  const displayName = currentModel?.name ?? "Auto";

  // Group models by provider
  const localModels = models.filter(m => m.provider === "ollama");
  const cloudModels = models.filter(m => m.provider === "google");

  const handleSelect = (modelId: string | null) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-7 rounded-lg transition-all font-medium text-xs gap-1.5 px-2.5",
          "hover:bg-white/10",
          selectedModel ? "text-cyan-400" : "text-zinc-400"
        )}
        title={`Model: ${displayName}`}
      >
        <Cpu className="size-3.5" />
        <span className="hidden sm:inline max-w-[80px] truncate">{displayName}</span>
        <ChevronDown className={cn(
          "size-3 opacity-50 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-white/10 bg-zinc-900 p-1.5 shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar"
          >
            {isLoading ? (
              <div className="text-xs text-zinc-500 px-3 py-4 text-center">Loading models…</div>
            ) : (
              <>
                {/* Auto detect option */}
                <button
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all mb-1",
                    !selectedModel ? "bg-white/10" : "hover:bg-white/5",
                  )}
                >
                  <Sparkles className="size-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">Auto</span>
                    <p className="text-[11px] text-white/50">Best model for the task</p>
                  </div>
                  {!selectedModel && <Check className="size-4 text-cyan-400 flex-shrink-0" />}
                </button>

                {/* Local models */}
                {localModels.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 px-2 py-1.5 mt-1">
                      <Cpu className="size-3" />
                      Local Models
                    </div>
                    {localModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                          model.id === selectedModel ? "bg-white/10" : "hover:bg-white/5",
                        )}
                      >
                        <Cpu className="size-4 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{model.name}</span>
                            {model.supportsThinking && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 flex-shrink-0">
                                Think
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/50 truncate">{model.description}</p>
                        </div>
                        {model.id === selectedModel && <Check className="size-4 text-cyan-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </>
                )}

                {/* Cloud models */}
                {cloudModels.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 px-2 py-1.5 mt-1">
                      <Cloud className="size-3" />
                      Cloud Models
                    </div>
                    {cloudModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                          model.id === selectedModel ? "bg-white/10" : "hover:bg-white/5",
                        )}
                      >
                        <Cloud className="size-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{model.name}</span>
                            {model.supportsThinking && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 flex-shrink-0">
                                Think
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/50 truncate">{model.description}</p>
                        </div>
                        {model.id === selectedModel && <Check className="size-4 text-cyan-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  /** Minimal mode — only ModeSelector + Send (used by thread panel) */
  minimal?: boolean;
  /** Independent mode state (overrides global store) */
  mode?: string;
  onModeChange?: (mode: string) => void;
  /** Voice mode controls (Gemini Live-style inline) */
  voiceActive?: boolean;
  voiceState?: VoiceState;
  voiceAudioLevel?: number;
  onVoiceInterrupt?: () => void;
  onVoiceEndSession?: () => void;
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
  minimal = false,
  mode,
  onModeChange,
  // Voice mode
  voiceActive = false,
  voiceState,
  voiceAudioLevel = 0,
  onVoiceInterrupt,
  onVoiceEndSession,
}: ChatInputBoxProps) {
  const [isFocused, setIsFocused] = useState(false);

  const [searchEnabled, setSearchEnabled] = useState(false);
  const showThinking = useChatStore((s) => s.showThinking);
  const toggleThinking = useChatStore((s) => s.toggleThinking);
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
    <div className={cn("space-y-2", className)}>


      {/* Main Input Container */}
      <div
        className={cn(
          "relative transition-all duration-300 ease-out",
          "rounded-2xl",
          "bg-zinc-900/90 backdrop-blur-sm",
          "border border-white/[0.08]",
          isFocused 
            ? "shadow-lg shadow-black/20 border-white/[0.15] ring-1 ring-white/[0.05]" 
            : "shadow-sm",
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
            {voiceActive ? (
              /* Voice mode controls */
              <>
                {/* Audio level indicator */}
                <div className="flex items-center gap-2 px-2">
                  <Volume2 className="size-4 text-purple-400" />
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                      animate={{ width: `${Math.min(voiceAudioLevel * 100, 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                {/* Voice state indicator */}
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  voiceState === 'listening' && "bg-emerald-500/20 text-emerald-400",
                  voiceState === 'speaking' && "bg-purple-500/20 text-purple-400",
                  voiceState === 'connecting' && "bg-amber-500/20 text-amber-400",
                )}>
                  {voiceState === 'listening' ? '● Listening' :
                   voiceState === 'speaking' ? '◉ AI Speaking' :
                   voiceState === 'connecting' ? '○ Connecting...' : ''}
                </span>
              </>
            ) : (
              /* Normal mode tools */
              !minimal && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 gap-1.5 px-2"
                    type="button"
                    disabled={disabled}
                  >
                    <Plus className="size-4" />
                  </Button>

                  {/* Search Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchEnabled(!searchEnabled)}
                    className={cn(
                      "h-8 rounded-lg gap-1.5 px-2.5 transition-all",
                      searchEnabled
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                    type="button"
                    disabled={disabled}
                  >
                    <Search className="size-3.5" />
                    <span className="text-xs">Search</span>
                  </Button>

                  {/* Thinking Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleThinking}
                    className={cn(
                      "h-8 rounded-lg gap-1.5 px-2.5 transition-all",
                      showThinking
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                    type="button"
                    disabled={disabled}
                    title="Toggle thinking visibility"
                  >
                    <Brain className="size-3.5" />
                    <span className="text-xs">Thinking</span>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Right: Model + Mode + Actions */}
          <div className="flex items-center gap-1">
            {voiceActive ? (
              /* Voice mode right controls */
              <>
                {/* Interrupt button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onVoiceInterrupt}
                  disabled={voiceState !== 'speaking'}
                  className={cn(
                    "h-8 rounded-lg gap-1.5 px-2.5 transition-all",
                    voiceState === 'speaking'
                      ? "text-amber-400 hover:bg-amber-500/20"
                      : "text-zinc-600"
                  )}
                  type="button"
                  title="Interrupt AI"
                >
                  <Hand className="size-3.5" />
                  <span className="text-xs">Tap to interrupt</span>
                </Button>

                <div className="w-px h-4 bg-white/10 mx-1" />

                {/* End Session / Stop button */}
                <Button
                  size="sm"
                  onClick={onVoiceEndSession}
                  className={cn(
                    "h-8 rounded-lg transition-all duration-200 gap-1.5",
                    "bg-red-500/20 text-red-400 hover:bg-red-500/30",
                    "border border-red-500/30"
                  )}
                  type="button"
                  title="End voice session"
                >
                  <Square className="size-3" fill="currentColor" />
                  <span className="text-xs">Stop</span>
                </Button>
              </>
            ) : (
              /* Normal mode right controls */
              <>
                {/* Model Selector (hidden in minimal mode) */}
                {!minimal && <ModelSelector />}

                <ModeSelector mode={mode} onModeChange={onModeChange} />

                {!minimal && (
                  <>
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
                  </>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
