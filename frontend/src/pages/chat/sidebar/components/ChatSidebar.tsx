/**
 * ChatSidebar - Grok-Style Expandable Sidebar
 *
 * Features:
 * - Collapsible: Icon rail (64px) ↔ Full sidebar (272px)
 * - Time-grouped chat history (Today, Yesterday, This Week, etc.)
 * - Search, New Chat, and collapse toggle actions
 * - Grok colors: #050505 (black), #363636 (glassy gray)
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Trash2,
  Check,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useChatSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
} from "../hooks/useChatSessions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchCommandPalette } from "../../search/components/SearchCommandPalette";
import { useSearchPalette } from "../../search/hooks/useSearchPalette";
import { isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

// ============================================================================
// Constants - Grok Colors
// ============================================================================

const GROK_BLACK = "#050505";
// Grok glassy gray: #363636 (used inline in Tailwind classes)

// ============================================================================
// Types
// ============================================================================

interface ChatSidebarProps {
  currentSessionId?: number;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function groupSessionsByTime(sessions: any[]) {
  const groups: Record<string, any[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "This Month": [],
    Older: [],
  };

  sessions.forEach((session) => {
    const date = new Date(session.created_at);
    if (isToday(date)) {
      groups["Today"]!.push(session);
    } else if (isYesterday(date)) {
      groups["Yesterday"]!.push(session);
    } else if (isThisWeek(date)) {
      groups["This Week"]!.push(session);
    } else if (isThisMonth(date)) {
      groups["This Month"]!.push(session);
    } else {
      groups["Older"]!.push(session);
    }
  });

  return Object.entries(groups).filter(([_, items]) => items.length > 0);
}

// ============================================================================
// Component
// ============================================================================

export function ChatSidebar({ currentSessionId, className }: ChatSidebarProps) {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useChatSessions();
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();
  const deleteSessionMutation = useDeleteSession();

  // Sidebar collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("chatSidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Search palette
  const searchPalette = useSearchPalette();

  // Local filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem("chatSidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Filter and group sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    return sessions.filter((s) =>
      s.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

  const groupedSessions = useMemo(
    () => groupSessionsByTime(filteredSessions),
    [filteredSessions]
  );

  // Handlers
  const handleCreateSession = () => {
    createSessionMutation.mutate({ title: "New Chat" });
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleRename = (id: number, title: string) => {
    setRenamingId(id);
    setRenameValue(title || "");
  };

  const saveRename = (id: number) => {
    if (renameValue.trim()) {
      updateSessionMutation.mutate({ sessionId: id, data: { title: renameValue } });
    }
    setRenamingId(null);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      deleteSessionMutation.mutate(id);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col h-full border-r border-white/10 transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "w-16" : "w-[272px]",
          className
        )}
        style={{ backgroundColor: GROK_BLACK }}
      >
        {/* Header: Toggle + New Chat */}
        <div className="flex items-center gap-2 p-3 border-b border-white/5">
          {/* Collapse Toggle */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white shrink-0"
                  onClick={handleToggleCollapse}
                >
                  {isCollapsed ? (
                    <PanelLeft className="size-5" />
                  ) : (
                    <PanelLeftClose className="size-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                <p>{isCollapsed ? "Expand" : "Collapse"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* New Chat Button - Full width when expanded */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2 h-9 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white text-sm"
              onClick={handleCreateSession}
            >
              <Plus className="size-4" />
              New Chat
            </Button>
          )}

          {/* Search Button */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white shrink-0"
                  onClick={searchPalette.open}
                >
                  <Search className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                <p>
                  Search <kbd className="ml-2 px-1 py-0.5 bg-zinc-900 rounded text-xs">⌘K</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Collapsed: Icon-only new chat */}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2 p-2 border-b border-white/5">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white"
                    onClick={handleCreateSession}
                  >
                    <Plus className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                  <p>New Chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Expanded: Search + History List */}
        {!isCollapsed && (
          <>
            {/* Search Input */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-zinc-500" />
                <Input
                  placeholder="Filter history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#363636]/30 border-white/5 h-9 text-sm placeholder:text-zinc-500"
                />
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin size-5 border-2 border-zinc-500 border-t-transparent rounded-full" />
                </div>
              ) : groupedSessions.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <p className="text-sm">No chats found</p>
                </div>
              ) : (
                groupedSessions.map(([label, groupItems]) => (
                  <div key={label} className="mb-4">
                    {/* Group Label */}
                    <div className="px-3 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                      {label}
                    </div>

                    {/* Session Items */}
                    <div className="space-y-0.5">
                      {groupItems.map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                            currentSessionId === session.id
                              ? "text-white"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5",
                            currentSessionId === session.id && "bg-[#363636]"
                          )}
                          onClick={() => navigate(`/chat/${session.id}`)}
                        >
                          {renamingId === session.id ? (
                            <div
                              className="flex-1 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="h-6 text-xs bg-transparent border-white/20"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRename(session.id);
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                              />
                              <Check
                                className="size-4 text-green-400 cursor-pointer shrink-0"
                                onClick={() => saveRename(session.id)}
                              />
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 truncate">
                                {session.title || "New Chat"}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 -mr-1 text-zinc-500 hover:text-white"
                                  >
                                    <MoreVertical className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-32 bg-zinc-900 border-white/10"
                                >
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRename(session.id, session.title);
                                    }}
                                  >
                                    <Pencil className="size-3 mr-2" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-400"
                                    onClick={(e) => handleDelete(session.id, e)}
                                  >
                                    <Trash2 className="size-3 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Search Command Palette - Global Overlay */}
      <SearchCommandPalette
        isOpen={searchPalette.isOpen}
        onClose={searchPalette.close}
        onCreateNewChat={handleCreateSession}
      />
    </>
  );
}
