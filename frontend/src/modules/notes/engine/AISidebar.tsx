/**
 * AISidebar - AFFiNE AI Chat Panel for Notes
 *
 * React implementation of AFFiNE's AI sidebar with:
 * - Empty state with onboarding actions
 * - Chat interface
 * - Synapse styling
 *
 * Exact text matches from AFFiNE:
 * - "What can I help you with?"
 * - Action items from preload-config.ts
 */

import { useState, useCallback } from "react";
import {
  Sparkles,
  Languages,
  Network,
  Image,
  PenLine,
  Send,
  X,
  History,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// Types
// ============================================================================

export interface AISidebarProps {
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback to close the sidebar */
  onClose: () => void;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Onboarding Actions (exact match from AFFiNE preload-config.ts)
// ============================================================================

const AI_ONBOARDING_ACTIONS = [
  {
    icon: Languages,
    text: "Read a foreign language article with AI",
    testId: "read-foreign-language-article-with-ai",
  },
  {
    icon: Network,
    text: "Tidy an article with AI MindMap Action",
    testId: "tidy-an-article-with-ai-mindmap-action",
  },
  {
    icon: Image,
    text: "Add illustrations to the article",
    testId: "add-illustrations-to-the-article",
  },
  {
    icon: PenLine,
    text: "Complete writing with AI",
    testId: "complete-writing-with-ai",
  },
  {
    icon: Send,
    text: "Freely communicate with AI",
    testId: "freely-communicate-with-ai",
  },
];

// ============================================================================
// Component
// ============================================================================

export function AISidebar({ isOpen, onClose, className }: AISidebarProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    
    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: inputValue }]);
    setInputValue("");
    
    // TODO: Integrate with actual AI backend
    // For now, just echo back
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I received: "${inputValue}"` },
      ]);
    }, 500);
  }, [inputValue]);

  const handleActionClick = useCallback((actionText: string) => {
    // Pre-fill input with action prompt
    setInputValue(actionText);
  }, []);

  if (!isOpen) return null;

  const hasMessages = messages.length > 0;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 bottom-4 w-80 z-40",
        "bg-zinc-950/95 backdrop-blur-xl",
        "border border-white/10 rounded-2xl shadow-2xl",
        "flex flex-col",
        className
      )}
      data-testid="ai-sidebar"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <span className="font-semibold text-white">AFFINE AI</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/5"
            title="History"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/5"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/5"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {hasMessages ? (
          // Chat Messages
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg text-sm",
                  msg.role === "user"
                    ? "bg-cyan-500/10 text-cyan-100 ml-4"
                    : "bg-zinc-800/50 text-zinc-200 mr-4"
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>
        ) : (
          // Empty State (AFFiNE exact match)
          <div className="flex flex-col items-center justify-center h-full text-center">
            {/* Logo */}
            <div className="mb-4">
              <Sparkles className="h-12 w-12 text-cyan-400" />
            </div>

            {/* Title - Exact AFFiNE text */}
            <h3
              className="text-lg font-semibold text-white mb-6"
              data-testid="chat-panel-empty-state"
            >
              What can I help you with?
            </h3>

            {/* Onboarding Actions */}
            <div className="space-y-2 w-full" data-testid="ai-onboarding">
              {AI_ONBOARDING_ACTIONS.map((action) => (
                <button
                  key={action.testId}
                  type="button"
                  data-testid={action.testId}
                  onClick={() => handleActionClick(action.text)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
                    "text-left text-sm text-zinc-300",
                    "hover:bg-white/5 hover:text-white transition-colors"
                  )}
                >
                  <action.icon className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span>{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 border-t border-white/10">
        <div className="flex items-end gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What are your thoughts?"
            className={cn(
              "flex-1 min-h-[40px] max-h-[120px] resize-none",
              "bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-500",
              "focus-visible:ring-cyan-500/50"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              "h-10 w-10 rounded-lg",
              inputValue.trim()
                ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AISidebar;
