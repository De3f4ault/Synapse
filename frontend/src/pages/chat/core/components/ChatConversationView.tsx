import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XIcon, Search } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInputBox } from "./ChatInputBox";
import { SearchBar } from "../../search/components/SearchBar";
import { scrollToOccurrence } from "../../search/utils/scrollToOccurrence";
import { useConversationSearch } from "../../search/hooks";
import type { ChatMessageResponse } from "@/api/generated";
import type { SearchOccurrence } from "../../search/types";

interface ChatConversationViewProps {
  messages: ChatMessageResponse[];
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
  onVoiceClick?: () => void;
  isSending?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  streamingThinking?: string;
}

export function ChatConversationView({
  messages,
  message,
  onMessageChange,
  onSend,
  onReset,
  onVoiceClick,
  isSending = false,
  isStreaming = false,
  streamingContent = "",
  streamingThinking = "",
}: ChatConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, isSearchOpen]);

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

  // Create temporary streaming message
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
    <div className="flex h-full flex-col">
      {/* Search Bar */}
      {isSearchOpen && (
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
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-4 md:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-end gap-2 mb-2">
            {/* Search Toggle Button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="size-8 rounded-full border bg-background/50 hover:bg-background"
              title="Search (Ctrl+F)"
            >
              <Search className="size-4" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              onClick={onReset}
              className="size-8 rounded-full border bg-background/50 hover:bg-background"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              occurrences={getMessageOccurrences(msg.id)}
              currentOccurrenceId={currentOccurrenceId}
            />
          ))}

          {streamingMessage && (
            <ChatMessage
              message={streamingMessage}
              isStreaming={true}
              thinking={streamingThinking}
              occurrences={[]}
              currentOccurrenceId={null}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 md:px-8 pb-6 pt-2">
        <div className="max-w-4xl mx-auto">
          <ChatInputBox
            message={message}
            onMessageChange={onMessageChange}
            onSend={onSend}
            onVoiceClick={onVoiceClick}
            placeholder="Continue the conversation..."
            disabled={isSending}
          />
        </div>
      </div>
    </div>
  );
}
