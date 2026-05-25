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
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionAwareTextarea } from "@/shared/platform/mentions/MentionAwareTextarea";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback, type DragEvent, type ClipboardEvent } from "react";
import { useMentionController, EntityPicker } from "@/shared/platform/mentions";
import { useEntitySearch } from "@/shared/platform/hooks/useEntitySearch";
import type { EntitySearchResult } from "@/shared/platform/types";
import { useChatMode, useSetChatMode, useSelectedModel, useSetSelectedModel } from "../state/chatSelectors";
import { useModels } from "../hooks/useModels";
import { motion, AnimatePresence } from "framer-motion";
import type { VoiceState } from "../../voice/engine/types";
import { useFileUpload } from "@/modules/chat/hooks/useFileUpload";

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
    color: "text-warning",
  },
  {
    id: "tutor",
    name: "Tutor",
    icon: <GraduationCap className="size-4" />,
    description: "Socratic learning guidance",
    color: "text-info",
  },
  {
    id: "deep_think",
    name: "Deep Think",
    icon: <Brain className="size-4" />,
    description: "Extended reasoning",
    color: "text-accent",
    hasThinking: true,
  },
  {
    id: "creative",
    name: "Creative",
    icon: <Sparkles className="size-4" />,
    description: "Imaginative exploration",
    color: "text-accent-coral",
  },
  {
    id: "research",
    name: "Research",
    icon: <Search className="size-4" />,
    description: "In-depth analysis",
    color: "text-accent-olive",
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
          "hover:bg-muted",
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
            className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-2xl z-50"
          >
            <div className="text-[10px] uppercase tracking-wider text-foreground/40 px-2 py-1.5 mb-1">
              Select Mode
            </div>
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleSelect(mode)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                  mode.id === chatMode
                    ? "bg-foreground/10"
                    : "hover:bg-muted/50",
                )}
              >
                <div className={cn("flex-shrink-0", mode.color)}>
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {mode.name}
                    </span>
                    {mode.hasThinking && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-accent/20 text-accent/80">
                        Thinking
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-foreground/50 truncate">
                    {mode.description}
                  </p>
                </div>
                {mode.id === chatMode && (
                  <Check className="size-4 text-primary flex-shrink-0" />
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
          "hover:bg-muted",
          selectedModel ? "text-primary" : "text-muted-foreground"
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
            className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar"
          >
            {isLoading ? (
              <div className="text-xs text-muted-foreground px-3 py-4 text-center">Loading models…</div>
            ) : (
              <>
                {/* Auto detect option */}
                <button
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all mb-1",
                    !selectedModel ? "bg-foreground/10" : "hover:bg-muted/50",
                  )}
                >
                  <Sparkles className="size-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">Auto</span>
                    <p className="text-[11px] text-foreground/50">Best model for the task</p>
                  </div>
                  {!selectedModel && <Check className="size-4 text-primary flex-shrink-0" />}
                </button>

                {/* Local models */}
                {localModels.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/40 px-2 py-1.5 mt-1">
                      <Cpu className="size-3" />
                      Local Models
                    </div>
                    {localModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                          model.id === selectedModel ? "bg-foreground/10" : "hover:bg-muted/50",
                        )}
                      >
                        <Cpu className="size-4 text-accent-olive flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{model.name}</span>
                            {model.supportsThinking && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-accent/20 text-accent/80 flex-shrink-0">
                                Think
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-foreground/50 truncate">{model.description}</p>
                        </div>
                        {model.id === selectedModel && <Check className="size-4 text-primary flex-shrink-0" />}
                      </button>
                    ))}
                  </>
                )}

                {/* Cloud models */}
                {cloudModels.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/40 px-2 py-1.5 mt-1">
                      <Cloud className="size-3" />
                      Cloud Models
                    </div>
                    {cloudModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                          model.id === selectedModel ? "bg-foreground/10" : "hover:bg-muted/50",
                        )}
                      >
                        <Cloud className="size-4 text-info flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{model.name}</span>
                            {model.supportsThinking && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-accent/20 text-accent/80 flex-shrink-0">
                                Think
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-foreground/50 truncate">{model.description}</p>
                        </div>
                        {model.id === selectedModel && <Check className="size-4 text-primary flex-shrink-0" />}
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
  onSend: (attachmentIds?: number[], previewUrls?: string[]) => void;
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
  /** Session ID for file uploads */
  sessionId?: number;
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
  sessionId,
  // Voice mode
  voiceActive = false,
  voiceState,
  voiceAudioLevel = 0,
  onVoiceInterrupt,
  onVoiceEndSession,
}: ChatInputBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [searchEnabled, setSearchEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload hook
  const {
    pendingFiles,
    uploadFiles,
    removeFile,
    clearAll: clearFiles,
    documentIds,
    hasFiles,
    isUploading,
    canAttachMore,
  } = useFileUpload(sessionId);

  // Auto-resize textarea when message changes without losing cursor position
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Save cursor position to prevent jumping during layout thrashing
      const { selectionStart, selectionEnd } = textarea;
      
      textarea.style.height = '24px';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden';
      
      // Restore cursor position if the textarea is focused
      if (document.activeElement === textarea && textarea.selectionStart !== selectionStart) {
        textarea.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }, [message]);

  const [mentionQueryState, setMentionQueryState] = useState("");
  const [mentionPickerEnabled, setMentionPickerEnabled] = useState(false);

  const { data: searchResults = [], isLoading: isSearching } = useEntitySearch(mentionQueryState, {
    enabled: mentionPickerEnabled && mentionQueryState.length >= 1,
    limit: 6,
  });

  // ── Single canonical insertion handler ────────────────────────────────────
  // Both keyboard selection (useMentionController) and mouse click
  // (EntityPicker mousedown) route through this one function.
  const insertMention = useCallback((entity: EntitySearchResult) => {
    if (!textareaRef.current) return;
    const input = textareaRef.current;
    const value = input.value;
    const selectionEnd = input.selectionEnd;
    const lastAtPos = value.lastIndexOf("@", selectionEnd - 1);
    if (lastAtPos === -1) return;
    const beforeAt = value.substring(0, lastAtPos);
    const afterCursor = value.substring(selectionEnd);
    const mentionText = `@[${entity.title}](entity:${entity.type}:${entity.id}) `;
    onMessageChange(beforeAt + mentionText + afterCursor);
    setMentionQueryState("");
    setMentionPickerEnabled(false);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(lastAtPos + mentionText.length, lastAtPos + mentionText.length);
    }, 0);
  }, [onMessageChange]);

  const {
    isPickerOpen: showPicker,
    activeIndex: activeIdx,
    openPicker: triggerPicker,
    closePicker: dismissPicker,
    setQuery: updateQuery,
    handleKeyDown: onPermissionKeyDown,
  } = useMentionController({
    onSelect: insertMention,
    onClose: () => {
      setMentionQueryState("");
      setMentionPickerEnabled(false);
    },
  }, searchResults);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showPicker) {
      const handled = onPermissionKeyDown(e);
      if (handled) return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((message.trim() || hasFiles) && !disabled && !isStreaming && !isUploading) {
        onSend(
          documentIds.length > 0 ? documentIds : undefined,
          documentIds.length > 0
            ? pendingFiles
                .filter((f) => f.status === 'uploaded' && f.documentId)
                .map((f) => f.preview)
            : undefined,
        );
        clearFiles();
      }
    }
  };

  // ==================== FILE HANDLING ====================

  const handleFileSelect = useCallback(() => {
    if (canAttachMore) fileInputRef.current?.click();
  }, [canAttachMore]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        uploadFiles(files);
      }
    },
    [uploadFiles],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer?.files) uploadFiles(e.dataTransfer.files);
    },
    [uploadFiles],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onMessageChange(newValue);

    const selectionEnd = e.target.selectionEnd;
    const lastAt = newValue.lastIndexOf("@", selectionEnd - 1);

    if (lastAt !== -1) {
      const fragment = newValue.substring(lastAt + 1, selectionEnd);
      // Only trigger if the fragment is a clean word-fragment (no newline, no space, short)
      if (!fragment.includes("\n") && !fragment.includes(" ") && fragment.length < 50) {
        if (!showPicker) triggerPicker(fragment);
        updateQuery(fragment);
        setMentionQueryState(fragment);
        setMentionPickerEnabled(true);
        return;
      }
    }
    if (showPicker) {
      dismissPicker();
      setMentionPickerEnabled(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>


      {/* Main Input Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative transition-all duration-300 ease-out",
          "rounded-2xl",
          "bg-card",
          "border border-border",
          isFocused 
            ? "shadow-lg shadow-lg border-border ring-1 ring-border" 
            : "shadow-sm",
          isDragOver && "border-primary/50 bg-primary/5",
        )}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-primary/10 border-2 border-dashed border-primary/40"
            >
              <div className="flex items-center gap-2 text-primary">
                <PaperclipIcon className="size-5" />
                <span className="text-sm font-medium">Drop files here</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,.pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Entity Picker Floating */}
        <AnimatePresence>
          {showPicker && (
            <div className="absolute bottom-full left-4 mb-2 z-50">
              <EntityPicker
                results={searchResults}
                activeIndex={activeIdx}
                onSelect={insertMention}
                isLoading={isSearching}
                query={mentionQueryState}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Attachment Preview Chips */}
        <AnimatePresence>
          {hasFiles && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {pendingFiles.map((pf) => (
                  <motion.div
                    key={pf.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      "relative group flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs",
                      pf.status === "error"
                        ? "border-red-500/30 bg-destructive/10"
                        : pf.status === "uploaded"
                          ? "border-accent-olive/30 bg-accent-olive/10"
                          : "border-border bg-foreground/5",
                    )}
                  >
                    {pf.preview ? (
                      <img src={pf.preview} alt={pf.file.name} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <FileText className="size-4 text-foreground/50" />
                    )}
                    <span className="max-w-[120px] truncate text-foreground/70">{pf.file.name}</span>
                    {pf.status === "uploading" && (
                      <>
                        <Loader2 className="size-3 animate-spin text-primary" />
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: "0%" }}
                            animate={{ width: `${pf.progress}%` }}
                          />
                        </div>
                      </>
                    )}
                    {pf.status === "error" && (
                      <span className="text-destructive text-[10px]" title={pf.error}>✕</span>
                    )}
                    <button
                      onClick={() => removeFile(pf.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-foreground/40 hover:text-foreground transition-all"
                    >
                      <X className="size-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Area */}
        <div className="px-4 pt-3 pb-2">
          <MentionAwareTextarea
            ref={textareaRef}
            placeholder={hasFiles && !message ? "Add a message or send with files..." : placeholder}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPaste={handlePaste}
            disabled={disabled || isStreaming}
            className={cn(
              "min-h-[24px] max-h-[200px] resize-none w-full",
              "border-0 bg-transparent p-0",
              "text-[15px] leading-relaxed placeholder:text-muted-foreground",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "custom-scrollbar",
            )}
            rows={1}
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
                  <Volume2 className="size-4 text-accent" />
                  <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      animate={{ width: `${Math.min(voiceAudioLevel * 100, 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                {/* Voice state indicator */}
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  voiceState === 'listening' && "bg-accent-olive/20 text-accent-olive",
                  voiceState === 'speaking' && "bg-accent/20 text-accent",
                  voiceState === 'connecting' && "bg-warning/20 text-warning",
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
                    className={cn(
                      "h-8 rounded-lg gap-1.5 px-2",
                      hasFiles
                        ? "text-primary bg-primary/10 hover:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      !canAttachMore && "opacity-50 cursor-not-allowed",
                    )}
                    type="button"
                    disabled={disabled || !canAttachMore}
                    onClick={handleFileSelect}
                    title={canAttachMore ? "Attach image or file" : "Max 5 files"}
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
                        ? "bg-accent-olive/20 text-accent-olive border border-accent-olive/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    type="button"
                    disabled={disabled}
                  >
                    <Search className="size-3.5" />
                    <span className="text-xs">Search</span>
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
                      ? "text-warning hover:bg-warning/20"
                      : "text-muted-foreground"
                  )}
                  type="button"
                  title="Interrupt AI"
                >
                  <Hand className="size-3.5" />
                  <span className="text-xs">Tap to interrupt</span>
                </Button>

                <div className="w-px h-4 bg-foreground/10 mx-1" />

                {/* End Session / Stop button */}
                <Button
                  size="sm"
                  onClick={onVoiceEndSession}
                  className={cn(
                    "h-8 rounded-lg transition-all duration-200 gap-1.5",
                    "bg-destructive/20 text-destructive hover:bg-destructive/30",
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
                    <div className="w-px h-4 bg-foreground/10 mx-1" />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                      "bg-destructive/20 text-destructive hover:bg-destructive/30",
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
                    onClick={() => {
                      onSend(
                        documentIds.length > 0 ? documentIds : undefined,
                        documentIds.length > 0
                          ? pendingFiles
                              .filter((f) => f.status === 'uploaded' && f.documentId)
                              .map((f) => f.preview)
                          : undefined,
                      );
                      clearFiles();
                    }}
                    disabled={(!message.trim() && !hasFiles) || disabled || isUploading}
                    className={cn(
                      "size-8 rounded-lg transition-all duration-300",
                      (message.trim() || hasFiles) && !disabled && !isUploading
                        ? "bg-primary text-foreground hover:bg-primary shadow-lg "
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    type="button"
                  >
                    {isUploading
                      ? <Loader2 className="size-4 animate-spin" />
                      : <SendIcon className="size-4" />
                    }
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
