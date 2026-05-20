import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  MessageCircle,
  Trash2,
  Loader2,
  X,
  Command,
  GripVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChatService } from "@/api/generated";
import type { ConversationSearchResult, ChatSessionResponse } from "@/api/generated";
import { useDebounce } from "@/hooks/useDebounce";
import { useChatSessions, useDeleteSession } from "../../sidebar/hooks/useChatSessions";
import { ConversationPreview } from "./ConversationPreview";

// ============================================================================
// Types
// ============================================================================

interface TimeGroup {
  label: string;
  results: ConversationSearchResult[];
}

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewChat: () => void;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Adapt ChatSessionResponse[] (from useChatSessions) into ConversationSearchResult[]
 * so the same groupByTime and ResultItem components work for both pre-query and search states.
 */
function adaptSessionsToSearchResults(sessions: ChatSessionResponse[]): ConversationSearchResult[] {
  return sessions.map((s) => ({
    session_id: s.id,
    session_title: s.title || "New Chat",
    match_type: "title",
    matched_snippet: "",
    message_id: null,
    created_at: s.created_at,
    relevance_score: 0,
  }));
}

function groupByTime(results: ConversationSearchResult[]): TimeGroup[] {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(now);
  thisWeek.setDate(thisWeek.getDate() - 7);
  const thisMonth = new Date(now);
  thisMonth.setMonth(thisMonth.getMonth() - 1);
  const thisYear = new Date(now);
  thisYear.setFullYear(thisYear.getFullYear() - 1);

  const groups: { [key: string]: ConversationSearchResult[] } = {
    Yesterday: [],
    "This Week": [],
    "This Month": [],
    "This Year": [],
    Older: [],
  };

  for (const result of results) {
    const date = new Date(result.created_at);
    if (date >= yesterday) {
      groups.Yesterday!.push(result);
    } else if (date >= thisWeek) {
      groups["This Week"]!.push(result);
    } else if (date >= thisMonth) {
      groups["This Month"]!.push(result);
    } else if (date >= thisYear) {
      groups["This Year"]!.push(result);
    } else {
      groups.Older!.push(result);
    }
  }

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, results]) => ({ label, results }));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffHours < 24 * 7) {
    const days = Math.floor(diffHours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

// ============================================================================
// Components
// ============================================================================

function ActionItem({
  icon: Icon,
  label,
  onClick,
  isSelected,
  onMouseEnter,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  isSelected: boolean;
  onMouseEnter: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors rounded-lg",
        isSelected
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground/70"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

function ResultItem({
  result,
  isSelected,
  onMouseEnter,
  onClick,
  onDelete,
}: {
  result: ConversationSearchResult;
  isSelected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex items-center justify-between w-full px-4 h-10 text-left rounded-lg group",
        isSelected
          ? "bg-primary/10"
          : "hover:bg-muted/50"
      )}
    >
      <div className="min-w-0 flex-1">
          <span
            className={cn(
              "text-sm truncate block",
              isSelected ? "text-primary-foreground" : "text-foreground/80"
            )}
          >
            {result.session_title}
          </span>
          {result.matched_snippet && result.match_type !== "title" && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {result.matched_snippet}
            </p>
          )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {/* Always rendered, visibility controlled — prevents layout reflow */}
        <div className={cn(
          "flex items-center gap-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
            Go <kbd className="ml-1">↵</kbd>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground w-[70px] text-right">
          {formatDate(result.created_at)}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchCommandPalette({
  isOpen,
  onClose,
  onCreateNewChat,
}: SearchCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewSessionId, setPreviewSessionId] = useState<number | null>(null);
  const [leftWidth, setLeftWidth] = useState(38); // percentage
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const deleteSessionMutation = useDeleteSession();

  // Pre-query: load recent sessions (same data source as the left sidebar)
  const { data: recentSessions = [] } = useChatSessions();
  const adaptedRecent = useMemo(
    () => adaptSessionsToSearchResults(recentSessions),
    [recentSessions]
  );

  // Search API query (only fires when user types)
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["chat-search", debouncedQuery],
    queryFn: () =>
      ChatService.searchConversationsApiV1ChatSearchGet(debouncedQuery, 20, true),
    enabled: debouncedQuery.length >= 1,
    staleTime: 1000 * 30,
  });

  // Show search results when typing, recent sessions otherwise
  const displayResults = debouncedQuery.length >= 1 ? searchResults : adaptedRecent;

  // Group results by time
  const timeGroups = useMemo(() => groupByTime(displayResults), [displayResults]);

  // Flat list of all items for keyboard navigation
  const flatItems = useMemo(() => {
    const items: { type: "action" | "result"; data?: ConversationSearchResult }[] = [
      { type: "action" }, // "Create New Chat" action
    ];
    for (const group of timeGroups) {
      for (const result of group.results) {
        items.push({ type: "result", data: result });
      }
    }
    return items;
  }, [timeGroups]);

  // Reset selection when the user's search query changes
  useEffect(() => {
    setSelectedIndex(flatItems.length > 1 ? 1 : 0);
    // Also set preview to the first result
    if (flatItems.length > 1 && flatItems[1]?.data) {
      setPreviewSessionId(flatItems[1].data.session_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Initialize preview on first open (when query is empty)
  useEffect(() => {
    if (isOpen && previewSessionId === null && flatItems.length > 1 && flatItems[1]?.data) {
      setSelectedIndex(1);
      setPreviewSessionId(flatItems[1].data.session_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flatItems.length]);

  // Wrapper to update both selectedIndex and previewSessionId atomically
  const selectItem = useCallback((index: number) => {
    setSelectedIndex(index);
    const item = flatItems[index];
    if (item?.type === "result" && item.data) {
      setPreviewSessionId(item.data.session_id);
    }
  }, [flatItems]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectItem(Math.min(selectedIndex + 1, flatItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          selectItem(Math.max(selectedIndex - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          const selected = flatItems[selectedIndex];
          if (selected?.type === "action") {
            onCreateNewChat();
            onClose();
          } else if (selected?.data) {
            navigate(`/chat/${selected.data.session_id}`);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatItems, selectedIndex, selectItem, navigate, onClose, onCreateNewChat]
  );

  // Global keyboard shortcut
  useEffect(() => {
    if (!isOpen) return;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Parent should handle this, but safety check
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (sessionId: number) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  // Drag-resize handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(Math.max(pct, 25), 65)); // clamp 25%-65%
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl bg-popover backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden flex h-[70vh]"
        onKeyDown={handleKeyDown}
      >
        {/* LEFT PANE: Search & Results */}
        <div
          className="flex flex-col min-w-0 shrink-0"
          style={{ width: `${leftWidth}%` }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <Search className="size-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-base"
            />
            {isLoading && <Loader2 className="size-4 text-primary animate-spin" />}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {/* Actions Section */}
            <div className="mb-2">
              <div className="flex items-center justify-between px-4 py-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </span>
              </div>
              <ActionItem
                icon={Plus}
                label="Create New Chat"
                onClick={() => {
                  onCreateNewChat();
                  onClose();
                }}
                isSelected={selectedIndex === 0}
                onMouseEnter={() => selectItem(0)}
              />
            </div>

            {/* Results by Time Group */}
            {timeGroups.map((group, groupIndex) => (
              <div key={group.label} className="mb-2">
                <div className="px-4 py-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                {group.results.map((result, resultIndex) => {
                  let flatIndex = 1;
                  for (let i = 0; i < groupIndex; i++) {
                    flatIndex += timeGroups[i]?.results.length ?? 0;
                  }
                  flatIndex += resultIndex;

                  return (
                    <ResultItem
                      key={result.session_id}
                      result={result}
                      isSelected={selectedIndex === flatIndex}
                      onMouseEnter={() => selectItem(flatIndex)}
                      onClick={() => {
                        navigate(`/chat/${result.session_id}`);
                        onClose();
                      }}
                      onDelete={() => handleDelete(result.session_id)}
                    />
                  );
                })}
              </div>
            ))}

            {/* Empty State — only when actively searching with no results */}
            {query && searchResults.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <MessageCircle className="mx-auto size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No conversations found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </div>
            )}

            {/* No sessions at all */}
            {!query && adaptedRecent.length === 0 && (
               <div className="text-center py-24 opacity-30">
                 <MessageCircle className="mx-auto size-12 text-muted-foreground mb-4" />
                 <p className="text-sm text-muted-foreground">No conversations yet</p>
               </div>
            )}
          </div>

          {/* Footer with shortcuts */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground shrink-0 bg-card/50">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>
                Close
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="size-3" />
              <kbd className="px-1.5 py-0.5 bg-muted rounded">K</kbd>
            </span>
          </div>
        </div>

        {/* DRAG HANDLE */}
        <div
          className="w-1.5 shrink-0 cursor-col-resize bg-foreground/5 hover:bg-primary/30 active:bg-primary/50 transition-colors flex items-center justify-center group"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        {/* RIGHT PANE: Preview */}
        <div className="flex-1 bg-card/30 flex flex-col min-w-0 overflow-hidden">
          <ConversationPreview
            sessionId={previewSessionId}
            highlightedQuery={debouncedQuery}
            className="flex-1 overflow-hidden"
          />
        </div>
      </div>
    </div>
  );
}

export default SearchCommandPalette;
