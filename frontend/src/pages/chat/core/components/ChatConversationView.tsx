/**
 * ChatConversationView — Renders the conversation list and input.
 *
 * Pure Vercel architecture: receives UIMessage[] directly from SDK.
 * No more synthetic streamingMessage construction or string-based content bridging.
 * The SDK automatically includes the live streaming assistant message in `messages`.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XIcon, Search } from "lucide-react";
import type { UIMessage } from "ai";
import type { VoiceState, TranscriptEntry } from "../../voice/engine/types";
import { MarkdownRenderer } from "@/shared/rendering";
import { ChatMessage } from "./ChatMessage";
import { ChatInputBox } from "./ChatInputBox";
import { ThreadButton } from "./ThreadButton";
import { SearchBar } from "../../search/components/SearchBar";
import { scrollToOccurrence } from "../../search/utils/scrollToOccurrence";
import { useConversationSearch } from "../../search/hooks";
import { useSuggestions } from "../hooks/useSuggestions";
import { SuggestionChipList, type SuggestionSignal } from "../../suggestions";
import { useCreateThread } from "../hooks/useThreads";
import { useCreateBranch } from "../hooks/useBranches";
import { useThreadStore } from "../state/threadStore";
import { useChatStore } from "../state/chatStore";
import { ComparisonPanel } from "./ComparisonPanel";
import { ComparisonToggle } from "./ComparisonToggle";
import { toast } from "sonner";
import type { SearchOccurrence } from "../../search/types";

// ── Props ────────────────────────────────────────────────────────────────────

interface ChatConversationViewProps {
  /** SDK UIMessage[] — single source of truth for all rendered messages */
  messages: UIMessage[];
  message: string;
  sessionId: number;
  sessionTitle?: string;
  onMessageChange: (value: string) => void;
  onSend: (attachmentIds?: number[], previewUrls?: string[]) => void;
  onReset: () => void;
  onStop?: () => void;
  onVoiceClick?: () => void;
  /** True when SDK status is 'submitted' | 'streaming' */
  isStreaming?: boolean;
  // Voice mode props (Gemini Live-style inline)
  voiceActive?: boolean;
  voiceState?: VoiceState;
  voiceInputTranscript?: string;
  voiceOutputTranscript?: string;
  voiceAudioLevel?: number;
  voiceTranscriptHistory?: TranscriptEntry[];
  onVoiceInterrupt?: () => void;
  onVoiceEndSession?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatConversationView({
  messages,
  message,
  sessionId,
  onMessageChange,
  onSend,
  onReset,
  onStop,
  onVoiceClick,
  isStreaming = false,
  voiceActive = false,
  voiceState,
  voiceInputTranscript = "",
  voiceOutputTranscript = "",
  voiceAudioLevel = 0,
  voiceTranscriptHistory = [],
  onVoiceInterrupt,
  onVoiceEndSession,
}: ChatConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Comparison mode from store
  const { isComparisonMode, selectedModels, comparisonStreaming } = useChatStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const hasAutoActivated = useRef(false);

  // IDE-style in-conversation search
  // Cast to `any` because search hook expects ChatMessageResponse[] — search typing is a to-do
  const search = useConversationSearch({ messages: messages as any });

  // Auto-activate search from URL ?q= param
  useEffect(() => {
    const queryFromUrl = searchParams.get("q");
    if (queryFromUrl && !hasAutoActivated.current && messages.length > 0) {
      hasAutoActivated.current = true;
      setIsSearchOpen(true);
      search.setQuery(queryFromUrl);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        return next;
      }, { replace: true });
    }
  }, [searchParams, messages.length, search, setSearchParams]);

  // Auto-scroll to first search occurrence
  useEffect(() => {
    if (isSearchOpen && hasAutoActivated.current && search.state.totalCount > 0) {
      const timer = setTimeout(() => {
        const first = search.state.occurrences[0];
        if (first) scrollToOccurrence(first);
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isSearchOpen, search.state.totalCount, search.state.occurrences]);

  // Get occurrences for a specific UIMessage (ID is string; search uses numeric)
  const getMessageOccurrences = useCallback(
    (messageId: string): SearchOccurrence[] => {
      const numId = parseInt(messageId, 10);
      if (isNaN(numId)) return [];
      return search.state.occurrences.filter((occ) => occ.messageId === numId);
    },
    [search.state.occurrences],
  );

  const activeMatch = search.getActiveOccurrence();
  const currentOccurrenceId = activeMatch
    ? `${activeMatch.messageId}:${activeMatch.blockIndex}:${activeMatch.start}`
    : null;

  // Keyboard shortcut Ctrl/Cmd+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll to active search occurrence
  useEffect(() => {
    const active = search.getActiveOccurrence();
    if (active && isSearchOpen) scrollToOccurrence(active);
  }, [search.state.currentIndex, isSearchOpen]);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    search.clearSearch();
  }, [search]);

  // Auto-scroll to bottom when messages update or streaming ticks
  useEffect(() => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, isSearchOpen]);

  // Detect "waiting for first token" — SDK submitted but no text in last assistant msg yet
  const isWaitingForResponse = useMemo(() => {
    if (!isStreaming) return false;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return true;
    return !lastAssistant.parts?.some((p) => p.type === "text" || p.type === "reasoning");
  }, [isStreaming, messages]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search Bar — fixed at top when open */}
      {isSearchOpen && (
        <div className="shrink-0 bg-background/50 backdrop-blur-md border-b border-border z-20">
          <div className="max-w-[1600px] mx-auto">
            <SearchBar
              state={search.state}
              occurrences={search.state.occurrences}
              onQueryChange={search.setQuery}
              onOptionsChange={search.setOptions}
              onNext={search.goToNext}
              onPrev={search.goToPrev}
              onClose={handleCloseSearch}
              onJumpTo={search.goToOccurrence}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1600px] mx-auto w-full px-8 py-4 pl-12 lg:pl-8 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <ThreadButton />
            {isSearchOpen ? (
              <div className="flex items-center gap-2 bg-card/80 p-1 rounded-lg border border-border animate-in fade-in slide-in-from-right-4 duration-200">
                <SearchBar
                  state={search.state}
                  occurrences={search.state.occurrences}
                  onQueryChange={search.setQuery}
                  onOptionsChange={search.setOptions}
                  onNext={search.goToNext}
                  onPrev={search.goToPrev}
                  onClose={() => setIsSearchOpen(false)}
                  onJumpTo={search.goToOccurrence}
                />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Search in conversation"
              >
                <Search className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
              title="New Chat / Reset"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        data-scroll-container="chat-messages"
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-4 md:px-8 pb-4 min-h-0"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* All messages — SDK includes the live streaming message as last entry */}
          {messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isStreamingMsg = isLast && isStreaming && msg.role === "assistant";
            return (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={isStreamingMsg}
                occurrences={getMessageOccurrences(msg.id)}
                currentOccurrenceId={currentOccurrenceId}
              />
            );
          })}

          {/* Loading indicator — shown after submit before first token arrives */}
          {isWaitingForResponse && !isComparisonMode && (
            <div className="flex items-start gap-3 animate-in fade-in duration-300">
              <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs">✦</span>
              </div>
              <div className="flex items-center gap-1 pt-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block size-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Voice Mode: committed transcript history */}
          {voiceActive && voiceTranscriptHistory.map((entry) => (
            <div key={entry.id} className={`flex ${entry.isInput ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  entry.isInput
                    ? "rounded-br-md bg-primary/20 border border-primary/20"
                    : "rounded-bl-md bg-foreground/5 border border-border"
                }`}
              >
                <div className={`text-sm ${entry.isInput ? "text-primary-foreground/90" : "text-foreground/70"}`}>
                  <MarkdownRenderer content={entry.text} />
                </div>
              </div>
            </div>
          ))}

          {/* Voice Mode: live user speech (ephemeral) */}
          {voiceActive && voiceInputTranscript && (
            <div className="flex justify-end animate-in fade-in duration-200">
              <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 bg-primary/20 border border-primary/20">
                <p className="text-sm text-primary-foreground/90">{voiceInputTranscript}</p>
                <span className="text-[10px] text-primary/60 mt-1 block">Speaking...</span>
              </div>
            </div>
          )}

          {/* Voice Mode: live AI response (ephemeral) */}
          {voiceActive && voiceOutputTranscript && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-foreground/5 border border-border">
                <div className="text-sm text-foreground/70">
                  <MarkdownRenderer content={voiceOutputTranscript} />
                </div>
                <span className="text-[10px] text-accent/60 mt-1 block">
                  {voiceState === "speaking" ? "🔊 Speaking..." : "AI"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Comparison Panel — wider than 4xl, rendered outside */}
        {(comparisonStreaming.A.content || comparisonStreaming.B.content) && (
          <div className="max-w-7xl mx-auto px-2 mt-6 animate-in fade-in duration-200">
            <ComparisonPanel
              contentA={comparisonStreaming.A.content}
              contentB={comparisonStreaming.B.content}
              modelA={selectedModels[0]}
              modelB={selectedModels[1]}
              isStreamingA={!comparisonStreaming.A.isComplete && isStreaming}
              isStreamingB={!comparisonStreaming.B.isComplete && isStreaming}
              thinkingA={comparisonStreaming.A.thinking}
              thinkingB={comparisonStreaming.B.thinking}
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-4 md:px-8 pb-6 pt-2 bg-gradient-to-t from-background via-background/80 to-transparent">
        <div className="max-w-4xl mx-auto space-y-3">
          <SuggestionsArea sessionId={sessionId} messages={messages} isStreaming={isStreaming} />
          <div className="flex justify-end mb-2">
            <ComparisonToggle />
          </div>
          <ChatInputBox
            message={message}
            onMessageChange={onMessageChange}
            onSend={onSend}
            onStop={onStop}
            onVoiceClick={onVoiceClick}
            isStreaming={isStreaming}
            placeholder={voiceActive ? "Type to ask..." : "Continue the conversation..."}
            disabled={isStreaming && !voiceActive}
            sessionId={sessionId}
            voiceActive={voiceActive}
            voiceState={voiceState}
            voiceAudioLevel={voiceAudioLevel}
            onVoiceInterrupt={onVoiceInterrupt}
            onVoiceEndSession={onVoiceEndSession}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-Component: Suggestions ────────────────────────────────────────────────

interface SuggestionsAreaProps {
  sessionId: number;
  messages: UIMessage[];
  isStreaming: boolean;
}

function SuggestionsArea({ sessionId, messages, isStreaming }: SuggestionsAreaProps) {
  const { suggestions, dismiss } = useSuggestions({
    sessionId,
    messages: messages as any, // useSuggestions only needs role + content
    enabled: !isStreaming && messages.length >= 2,
  });

  const createThread = useCreateThread();
  const createBranch = useCreateBranch(sessionId);
  const { openPanel, switchToThread } = useThreadStore();

  const handleAccept = useCallback(async (suggestion: SuggestionSignal) => {
    if (suggestion.type === "START_THREAD") {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const lastUserText =
        lastUser?.parts?.find((p) => p.type === "text") &&
        ((lastUser.parts.find((p) => p.type === "text") as any).text || "") ||
        (lastUser as any)?.content || "";
      const title = lastUserText.slice(0, 50) || "New Thread";
      try {
        const thread = await createThread.mutateAsync({
          sessionId,
          title,
          rootMessageId: suggestion.anchorMessageId,
        });
        switchToThread(thread.id, thread);
        openPanel();
        toast.success("Thread created");
      } catch {
        toast.error("Failed to create thread");
      }
    } else if (suggestion.type === "CREATE_BRANCH") {
      try {
        await createBranch.mutateAsync({ messageId: suggestion.anchorMessageId });
        toast.success("Branch created - use arrows to navigate");
      } catch {
        toast.error("Failed to create branch");
      }
    }
    dismiss(suggestion);
  }, [messages, sessionId, createThread, createBranch, switchToThread, openPanel, dismiss]);

  const handleDismiss = useCallback((s: SuggestionSignal) => dismiss(s), [dismiss]);

  if (suggestions.length === 0) return null;
  return (
    <SuggestionChipList suggestions={suggestions} onAccept={handleAccept} onDismiss={handleDismiss} />
  );
}
