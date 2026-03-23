import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XIcon, Search } from "lucide-react";
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
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ComparisonPanel } from "./ComparisonPanel";
import { ComparisonToggle } from "./ComparisonToggle";
import { toast } from "sonner";

import type { ChatMessageResponse } from "@/api/generated";
import type { SearchOccurrence } from "../../search/types";


interface ChatConversationViewProps {
  messages: ChatMessageResponse[];
  message: string;
  sessionId: number;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
  onStop?: () => void;
  onVoiceClick?: () => void;
  isSending?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  streamingThinking?: string;
  sessionTitle?: string;
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

export function ChatConversationView({
  messages,
  message,
  sessionId,
  onMessageChange,
  onSend,
  onReset,
  onStop,
  onVoiceClick,
  isSending = false,
  isStreaming = false,
  streamingContent = "",
  streamingThinking = "",
  // Voice mode
  voiceActive = false,
  voiceState,
  voiceInputTranscript = "",
  voiceOutputTranscript = "",
  voiceAudioLevel = 0,
  voiceTranscriptHistory = [],
  onVoiceInterrupt,
  onVoiceEndSession,
  // sessionTitle, // Unused
}: ChatConversationViewProps) {

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  


  // Comparison mode state from chatStore
  const { 
    isComparisonMode, 
    selectedModels, 
    comparisonStreaming 
  } = useChatStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const hasAutoActivated = useRef(false);

  // IDE-style search
  const search = useConversationSearch({ messages });

  // Auto-activate search from URL query param (?q=...)
  useEffect(() => {
    const queryFromUrl = searchParams.get('q');

    // Only activate if we have a query, haven't done it yet, and messages are loaded
    if (queryFromUrl && !hasAutoActivated.current && messages.length > 0) {
      hasAutoActivated.current = true;
      setIsSearchOpen(true);
      search.setQuery(queryFromUrl);

      // Clean up URL (remove ?q param after reading)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        return next;
      }, { replace: true });
    }
  }, [searchParams, messages.length, search, setSearchParams]);

  // Auto-scroll to first occurrence when search results appear from auto-activation
  useEffect(() => {
    if (isSearchOpen && hasAutoActivated.current && search.state.totalCount > 0) {
      // Small timeout to allow DOM to render highlights
      const timer = setTimeout(() => {
        const firstOccurrence = search.state.occurrences[0];
        if (firstOccurrence) {
          scrollToOccurrence(firstOccurrence); // Pass full occurrence object
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return; // Explicit return for other code paths
  }, [isSearchOpen, search.state.totalCount, search.state.occurrences]);

  // Get occurrences for a specific message
  const getMessageOccurrences = useCallback((messageId: number): SearchOccurrence[] => {
    return search.state.occurrences.filter(occ => occ.messageId === messageId);
  }, [search.state.occurrences]);

  // Get current occurrence ID (computed from match properties)
  const activeMatch = search.getActiveOccurrence();
  const currentOccurrenceId = activeMatch
    ? `${activeMatch.messageId}:${activeMatch.blockIndex}:${activeMatch.start}`
    : null;

  // Auto-scroll to bottom when new messages arrive, streaming updates, or thinking starts
  useEffect(() => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, streamingThinking, isStreaming, isSearchOpen]);

  // Scroll to occurrence when it changes
  useEffect(() => {
    const activeOccurrence = search.getActiveOccurrence();
    if (activeOccurrence && isSearchOpen) {
      scrollToOccurrence(activeOccurrence);
    }
  }, [search.state.currentIndex, isSearchOpen]);

  // Keyboard shortcut to open search (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    search.clearSearch();
  }, [search]);

  // Derive "thinking" state: streaming started but no content yet
  const isWaitingForResponse = isStreaming && !streamingContent && !streamingThinking;

  // Create temporary streaming message (only when we have content)
  const streamingMessage: ChatMessageResponse | null =
    isStreaming && (streamingContent || streamingThinking)
      ? {
        id: -1, // Temporary negative ID
        session_id: messages[0]?.session_id || 0,
        role: "assistant" as const,
        content: streamingContent,
        tokens: 0,
        model_used: null,
        function_calls: null,
        grounding_sources: null,
        created_at: new Date().toISOString(),
      }
      : null;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search Bar - Fixed at top when open */}
      {isSearchOpen && (
        <div className="shrink-0 bg-background/50 backdrop-blur-md border-b border-white/5 z-20">
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

      {/* Hub-Style Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1600px] mx-auto w-full px-8 py-4 pl-12 lg:pl-8 flex items-center justify-end">
           {/* Actions (Search / Reset / Threads) - Now right-aligned since title is gone */}
           <div className="flex items-center gap-2">
              {/* Threads Button */}
              <ThreadButton />

             {isSearchOpen ? (
                <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-white/10 animate-in fade-in slide-in-from-right-4 duration-200">
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
                 className="text-zinc-500 hover:text-white hover:bg-white/10"
                 title="Search in conversation"
               >
                 <Search className="size-4" />
               </Button>
             )}

             <Button
               variant="ghost"
               size="icon"
               onClick={onReset}
               className="text-zinc-500 hover:text-white hover:bg-white/10"
               title="New Chat / Reset"
             >
               <XIcon className="size-4" />
             </Button>
           </div>
        </div>
      </div>
      {/* Messages Area - Scrollable, takes remaining space */}
      <div
        ref={scrollContainerRef}
        data-scroll-container="chat-messages"
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-4 md:px-8 pb-4 min-h-0"
      >
        <div className="max-w-4xl mx-auto space-y-6">

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              occurrences={getMessageOccurrences(msg.id)}
              currentOccurrenceId={currentOccurrenceId}
            />
          ))}

          {/* Thinking Indicator - shows while waiting for first token */}
          {isWaitingForResponse && (
            <div className="animate-in fade-in duration-200">
              <ThinkingIndicator />
            </div>
          )}

          {/* Streaming Message - shows once content starts arriving (normal mode) */}
          {streamingMessage && !isComparisonMode && (
            <ChatMessage
              message={streamingMessage}
              isStreaming={true}
              thinking={streamingThinking}
              occurrences={[]}
              currentOccurrenceId={null}
            />
          )}

          {/* Voice Mode: Committed transcripts (persistent — survive across turns) */}
          {voiceActive && voiceTranscriptHistory.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.isInput ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  entry.isInput
                    ? 'rounded-br-md bg-cyan-600/20 border border-cyan-500/20'
                    : 'rounded-bl-md bg-white/5 border border-white/10'
                }`}
              >
                <div className={`text-sm ${
                  entry.isInput ? 'text-cyan-100/90' : 'text-zinc-200'
                }`}>
                  <MarkdownRenderer content={entry.text} />
                </div>
              </div>
            </div>
          ))}

          {/* Voice Mode: Live in-progress user speech (ephemeral) */}
          {voiceActive && voiceInputTranscript && (
            <div className="flex justify-end animate-in fade-in duration-200">
              <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 bg-cyan-600/20 border border-cyan-500/20">
                <p className="text-sm text-cyan-100/90">{voiceInputTranscript}</p>
                <span className="text-[10px] text-cyan-400/60 mt-1 block">Speaking...</span>
              </div>
            </div>
          )}

          {/* Voice Mode: Live in-progress AI response (ephemeral) */}
          {voiceActive && voiceOutputTranscript && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-white/5 border border-white/10">
                <div className="text-sm text-zinc-200">
                  <MarkdownRenderer content={voiceOutputTranscript} />
                </div>
                <span className="text-[10px] text-purple-400/60 mt-1 block">
                  {voiceState === 'speaking' ? '🔊 Speaking...' : 'AI'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Comparison Panel — rendered OUTSIDE max-w-4xl so it can be wider */}
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

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 px-4 md:px-8 pb-6 pt-2 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* AI Suggestions - Above input (hidden during streaming) */}
          <SuggestionsArea
            sessionId={sessionId}
            messages={messages}
            isStreaming={isStreaming}
          />

          {/* Comparison Mode Toggle */}
          <div className="flex justify-end mb-2">
            <ComparisonToggle />
          </div>

          {/* Chat Input with integrated Stop button */}
          <ChatInputBox
            message={message}
            onMessageChange={onMessageChange}
            onSend={onSend}
            onStop={onStop}
            onVoiceClick={onVoiceClick}
            isStreaming={isStreaming}
            placeholder={voiceActive ? "Type to ask..." : "Continue the conversation..."}
            disabled={isSending && !voiceActive}
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

// ============================================================================
// Sub-Component: Suggestions Area
// ============================================================================

interface SuggestionsAreaProps {
  sessionId: number;
  messages: ChatMessageResponse[];
  isStreaming: boolean;
}

function SuggestionsArea({ sessionId, messages, isStreaming }: SuggestionsAreaProps) {
  const { suggestions, dismiss } = useSuggestions({
    sessionId,
    messages,
    enabled: !isStreaming && messages.length >= 2,
  });

  const createThread = useCreateThread();
  const createBranch = useCreateBranch(sessionId);
  const { openPanel, switchToThread } = useThreadStore();

  const handleAccept = useCallback(async (suggestion: SuggestionSignal) => {
    if (suggestion.type === 'START_THREAD') {
      // Find the last user message content for thread title
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      const title = lastUser?.content?.slice(0, 50) || 'New Thread';

      try {
        const thread = await createThread.mutateAsync({
          sessionId,
          title,
          rootMessageId: suggestion.anchorMessageId,
        });
        
        // Switch to thread context
        switchToThread(thread.id, thread);
        openPanel();
        toast.success('Thread created');
      } catch {
        toast.error('Failed to create thread');
      }
    } else if (suggestion.type === 'CREATE_BRANCH') {
      try {
        await createBranch.mutateAsync({
          messageId: suggestion.anchorMessageId,
        });
        toast.success('Branch created - use arrows to navigate');
      } catch {
        toast.error('Failed to create branch');
      }
    }

    // Dismiss after action
    dismiss(suggestion);
  }, [messages, sessionId, createThread, createBranch, switchToThread, openPanel, dismiss]);

  const handleDismiss = useCallback((suggestion: SuggestionSignal) => {
    dismiss(suggestion);
  }, [dismiss]);

  if (suggestions.length === 0) return null;

  return (
    <SuggestionChipList
      suggestions={suggestions}
      onAccept={handleAccept}
      onDismiss={handleDismiss}
    />
  );
}
