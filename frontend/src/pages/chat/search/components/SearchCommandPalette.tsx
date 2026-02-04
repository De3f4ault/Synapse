/**
 * SearchCommandPalette — Grok-style search modal
 *
 * Features:
 * - Cmd/Ctrl+K keyboard shortcut
 * - Time-grouped results (Yesterday, This Week, This Month, Older)
 * - Inline hover actions (Go, Edit, Delete)
 * - Keyboard navigation (↑↓, Enter, Escape)
 * - Side panel preview
 */

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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChatService } from "@/api/generated";
import type { ConversationSearchResult } from "@/api/generated";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeleteSession } from "../../sidebar/hooks/useChatSessions";
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
          ? "bg-cyan-500/10 text-cyan-400"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
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
  const [showActions, setShowActions] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        onMouseEnter();
        setShowActions(true);
      }}
      onMouseLeave={() => setShowActions(false)}
      className={cn(
        "flex items-center justify-between w-full px-4 py-2.5 text-left transition-colors rounded-lg group",
        isSelected
          ? "bg-cyan-500/10"
          : "hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <MessageCircle
          className={cn(
            "size-4 shrink-0",
            isSelected ? "text-cyan-400" : "text-zinc-500"
          )}
        />
        <span
          className={cn(
            "text-sm truncate",
            isSelected ? "text-cyan-100" : "text-zinc-300"
          )}
        >
          {result.session_title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {(showActions || isSelected) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">
              Go <kbd className="ml-1">↵</kbd>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
        <span className="text-xs text-zinc-500">
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
  const debouncedQuery = useDebounce(query, 200);

  const deleteSessionMutation = useDeleteSession();

  // Search API query
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["chat-search", debouncedQuery],
    queryFn: () =>
      ChatService.searchConversationsApiV1ChatSearchGet(debouncedQuery, 20, true),
    enabled: debouncedQuery.length >= 1,
    staleTime: 1000 * 30,
  });

  // Group results by time
  const timeGroups = useMemo(() => groupByTime(searchResults), [searchResults]);

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

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

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
          setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
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
    [flatItems, selectedIndex, navigate, onClose, onCreateNewChat]
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Widened for 2-pane layout */}
      <div
        className="relative w-full max-w-5xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex h-[70vh]"
        onKeyDown={handleKeyDown}
      >
        {/* LEFT PANE: Search & Results */}
        <div className="w-[38%] flex flex-col min-w-0 border-r border-white/10">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
            <Search className="size-5 text-zinc-500" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 border-0 bg-transparent text-white placeholder:text-zinc-500 focus-visible:ring-0 text-base"
            />
            {isLoading && <Loader2 className="size-4 text-cyan-400 animate-spin" />}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-500 hover:text-white"
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
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
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
                onMouseEnter={() => setSelectedIndex(0)}
              />
            </div>

            {/* Results by Time Group */}
            {timeGroups.map((group, groupIndex) => (
              <div key={group.label} className="mb-2">
                <div className="px-4 py-1">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                {group.results.map((result, resultIndex) => {
                  // Calculate flat index
                  let flatIndex = 1; // Start after "Create New Chat"
                  for (let i = 0; i < groupIndex; i++) {
                    flatIndex += timeGroups[i]?.results.length ?? 0;
                  }
                  flatIndex += resultIndex;

                  return (
                    <ResultItem
                      key={result.session_id}
                      result={result}
                      isSelected={selectedIndex === flatIndex}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
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

            {/* Empty State */}
            {query && searchResults.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <MessageCircle className="mx-auto size-8 text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500">No conversations found</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Try a different search term
                </p>
              </div>
            )}
            
            {!query && searchResults.length === 0 && (
               <div className="text-center py-24 opacity-30">
                 <Search className="mx-auto size-12 text-zinc-600 mb-4" />
                 <p className="text-sm text-zinc-400">Type to search history...</p>
               </div>
            )}
          </div>

          {/* Footer with shortcuts */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-[10px] text-zinc-500 shrink-0 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd>
                Close
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="size-3" />
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">K</kbd>
            </span>
          </div>
        </div>

        {/* RIGHT PANE: Preview */}
        <div className="flex-1 bg-zinc-950/30 flex flex-col min-w-0">
          <ConversationPreview
            sessionId={flatItems[selectedIndex]?.data?.session_id || null}
            highlightedQuery={debouncedQuery}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}

export default SearchCommandPalette;
