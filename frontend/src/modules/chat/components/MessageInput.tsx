import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Send, 
  Loader2, 
  Plus, 
  Brain, 
  Search, 
  Wrench, 
  ChevronDown, 
  Check,
  Zap,
  GraduationCap,
  Sparkles,
  X
} from "lucide-react";

/**
 * Unified MessageInput Component
 * 
 * Design philosophy (inspired by DeepSeek + Claude + Qwen):
 * - Clean pill-shaped input
 * - Left: Attachment button
 * - Below input: Feature toggles (DeepThink, Search, Tools)
 * - Right: Mode selector pill + Send button
 * - Mode dropdown: Shows all modes with icons and descriptions
 */

// Mode definitions
export interface Mode {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  hasThinking?: boolean;
}

export const MODES: Mode[] = [
  {
    id: "direct",
    name: "Direct",
    icon: <Zap className="h-4 w-4" />,
    description: "Fast, concise responses",
    color: "text-amber-400",
  },
  {
    id: "tutor",
    name: "Tutor",
    icon: <GraduationCap className="h-4 w-4" />,
    description: "Socratic learning guidance",
    color: "text-blue-400",
  },
  {
    id: "deep_think",
    name: "Deep Think",
    icon: <Brain className="h-4 w-4" />,
    description: "Extended reasoning for complex problems",
    color: "text-purple-400",
    hasThinking: true,
  },
  {
    id: "creative",
    name: "Creative",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Imaginative and exploratory",
    color: "text-pink-400",
  },
  {
    id: "research",
    name: "Research",
    icon: <Search className="h-4 w-4" />,
    description: "In-depth analysis with sources",
    color: "text-emerald-400",
  },
];

interface MessageInputProps {
  onSend: (content: string, options?: { mode: string; enableSearch?: boolean }) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  initialMode?: string;
  onModeChange?: (mode: string) => void;
}

export function MessageInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Message Synapse...",
  className,
  maxLength = 4000,
  initialMode = "tutor",
  onModeChange,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedMode, setSelectedMode] = useState(initialMode);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Always have a valid mode - fallback to tutor (MODES[1]) if not found
  const currentMode = MODES.find(m => m.id === selectedMode) ?? MODES[1]!;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModeDropdown(false);
        setShowToolsPanel(false);
      }
    };
    document.addEventListener("keydown", handleEscape as any);
    return () => document.removeEventListener("keydown", handleEscape as any);
  }, []);

  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId);
    setShowModeDropdown(false);
    onModeChange?.(modeId);
    // Persist to localStorage
    localStorage.setItem("synapse-chat-mode", modeId);
  };

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || disabled || isLoading) return;

    onSend(trimmed, { mode: selectedMode, enableSearch: searchEnabled });
    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [message, disabled, isLoading, onSend, selectedMode, searchEnabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const isOverLimit = message.length > maxLength;
  const canSend = message.trim().length > 0 && !isOverLimit && !disabled && !isLoading;

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Thinking hint (shown for Deep Think mode) */}
      <AnimatePresence>
        {currentMode.hasThinking && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center justify-center gap-2 text-xs text-purple-400/80"
          >
            <Brain className="h-3 w-3" />
            <span>Thinking enabled — AI will show reasoning process</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Container */}
      <div
        className={cn(
          "relative rounded-2xl border transition-all duration-200 bg-[#0d0d0d]",
          isFocused
            ? "border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            : "border-white/10 hover:border-white/15",
        )}
      >
        {/* Textarea Row */}
        <div className="flex items-end">
          {/* Attachment Button */}
          <div className="pb-3 pl-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
              title="Attach file"
            >
              <Plus className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            maxLength={maxLength}
            className={cn(
              "flex-1 w-full resize-none bg-transparent px-3 py-4",
              "text-[var(--synapse-text-primary)] placeholder:text-[var(--synapse-text-tertiary)]",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[200px] min-h-[52px] leading-relaxed text-[15px]",
            )}
          />

          {/* Send Button */}
          <div className="pb-3 pr-3">
            <motion.button
              whileHover={canSend ? { scale: 1.05 } : {}}
              whileTap={canSend ? { scale: 0.95 } : {}}
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                canSend
                  ? "bg-[var(--synapse-cyan)] text-black shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 text-white/20 cursor-not-allowed",
              )}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Send className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-0">
          {/* Left: Feature Toggles (DeepSeek style) */}
          <div className="flex items-center gap-2">
            {/* Tools Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowToolsPanel(!showToolsPanel)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                showToolsPanel
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Tools</span>
            </motion.button>

            {/* Search Toggle (DeepSeek style) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSearchEnabled(!searchEnabled)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                searchEnabled
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
            </motion.button>
          </div>

          {/* Right: Mode Selector (Claude/Qwen hybrid) */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                "bg-white/5 hover:bg-white/10 border border-white/10",
                currentMode.color,
              )}
            >
              {currentMode.icon}
              <span className="text-white">{currentMode.name}</span>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-white/50 transition-transform",
                showModeDropdown && "rotate-180"
              )} />
            </motion.button>

            {/* Mode Dropdown */}
            <AnimatePresence>
              {showModeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-white/10 bg-[#1a1a1a] p-2 shadow-2xl z-50"
                >
                  <div className="text-[10px] uppercase tracking-wider text-white/40 px-2 py-1.5 mb-1">
                    Select Mode
                  </div>
                  {MODES.map((mode) => (
                    <motion.button
                      key={mode.id}
                      whileHover={{ x: 2 }}
                      onClick={() => handleModeSelect(mode.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                        mode.id === selectedMode
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                              Thinking
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 truncate">
                          {mode.description}
                        </p>
                      </div>
                      {mode.id === selectedMode && (
                        <Check className="h-4 w-4 text-[var(--synapse-cyan)] flex-shrink-0" />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tools Panel (expandable) */}
      <AnimatePresence>
        {showToolsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/60">Available Tools</span>
                <button 
                  onClick={() => setShowToolsPanel(false)}
                  className="p-1 rounded hover:bg-white/10 text-white/40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Create Quiz", icon: "📝", desc: "Generate questions" },
                  { name: "Flashcards", icon: "🎴", desc: "Spaced repetition" },
                  { name: "Summarize", icon: "📋", desc: "Condense content" },
                  { name: "Explain", icon: "💡", desc: "Break down concepts" },
                ].map((tool) => (
                  <button
                    key={tool.name}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-all"
                  >
                    <span className="text-lg">{tool.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-white">{tool.name}</div>
                      <div className="text-[10px] text-white/40">{tool.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MessageInput;
