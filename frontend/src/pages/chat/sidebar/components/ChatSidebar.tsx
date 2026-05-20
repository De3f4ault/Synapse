/**
 * ChatSidebar - Expandable Sidebar
 *
 * Features:
 * - Collapsible: Icon rail (64px) ↔ Full sidebar (272px)
 * - Time-grouped chat history (Today, Yesterday, This Week, etc.)
 * - Search, New Chat, and collapse toggle actions
 * - Warm design system tokens
 */

import { useState, useMemo, useEffect, useRef } from "react";
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
  History as HistoryIcon,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchCommandPalette } from "../../search/components/SearchCommandPalette";
import { useSearchPalette } from "../../search/hooks/useSearchPalette";
import { isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";


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

  // History popover — hover-triggered
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openHistory = () => {
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    setHistoryOpen(true);
  };
  const closeHistory = () => {
    historyTimeoutRef.current = setTimeout(() => setHistoryOpen(false), 200);
  };

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
          "flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "w-16" : "w-[272px]",
          isCollapsed
            ? "my-3 ml-2 rounded-2xl border border-border bg-card/90 backdrop-blur-xl"
            : "h-full rounded-2xl border-r border-border",
          !isCollapsed && "bg-background",
          className
        )}
      >
        {/* ============================================================ */}
        {/* COLLAPSED — Grok-style icon rail                              */}
        {/* ============================================================ */}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-1 py-3 px-1">
            {/* Expand toggle */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleToggleCollapse}
                  >
                    <PanelLeft className="size-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                  <p>Expand Sidebar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* New Chat */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleCreateSession}
                  >
                    <Plus className="size-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                  <p>New Chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Search */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={searchPalette.open}
                  >
                    <Search className="size-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                  <p>Search <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd></p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Divider */}
            <div className="w-6 h-px bg-border my-1" />

            {/* History — hover-triggered popover */}
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <div
                  onMouseEnter={openHistory}
                  onMouseLeave={closeHistory}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-xl transition-colors",
                      historyOpen
                        ? "bg-muted/50 text-foreground"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <HistoryIcon className="size-[18px]" />
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={12}
                avoidCollisions
                collisionPadding={16}
                className="w-[260px] max-h-[420px] p-0 border-border bg-popover backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl shadow-lg"
                onMouseEnter={openHistory}
                onMouseLeave={closeHistory}
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-[11px] font-semibold text-foreground/80 uppercase tracking-widest">History</span>
                </div>

                {/* Session list — invisible scrollbar */}
                <div className="overflow-y-auto max-h-[340px] py-1.5 scrollbar-hide">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin size-4 border-2 border-muted-foreground border-t-transparent rounded-full" />
                    </div>
                  ) : groupedSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">No chats yet</div>
                  ) : (
                    groupedSessions.map(([label, groupItems]) => (
                      <div key={label} className="mb-1.5">
                        {/* Date group */}
                        <div className="px-4 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {label}
                        </div>
                        {/* Items */}
                        {groupItems.map((session: any) => (
                          <TooltipProvider key={session.id} delayDuration={400}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "group flex items-center px-4 py-2 mx-1.5 rounded-lg cursor-pointer text-[12px] transition-all",
                                    currentSessionId === session.id
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "text-muted-foreground hover:text-foreground/70 hover:bg-muted/50 border border-transparent"
                                  )}
                                  onClick={() => navigate(`/chat/${session.id}`)}
                                >
                                  <span className="truncate">
                                    {session.title || "New Chat"}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                sideOffset={14}
                                className="max-w-[260px] bg-popover backdrop-blur-xl text-foreground/70 border-border rounded-lg text-xs px-3 py-2"
                              >
                                <p className="break-words">{session.title || "New Chat"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-4 py-2.5">
                  <button
                    className="text-[11px] text-muted-foreground hover:text-foreground/80 transition-colors"
                    onClick={() => {
                      setIsCollapsed(false);
                      setHistoryOpen(false);
                    }}
                  >
                    See all
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* ============================================================ */}
        {/* EXPANDED — Header                                             */}
        {/* ============================================================ */}
        {!isCollapsed && (
          <div className="flex items-center gap-2 p-3 border-b border-border">
            {/* Collapse Toggle */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    onClick={handleToggleCollapse}
                  >
                    <PanelLeftClose className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                  <p>Collapse</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* New Chat */}
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2 h-9 rounded-lg hover:bg-muted text-foreground/80 hover:text-foreground text-sm"
              onClick={handleCreateSession}
            >
              <Plus className="size-4" />
              New Chat
            </Button>

            {/* Search */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    onClick={searchPalette.open}
                  >
                    <Search className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                  <p>Search <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">⌘K</kbd></p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Expanded: Search + History List */}
        {!isCollapsed && (
          <>
            {/* Search Input */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Filter history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/30 border-border h-9 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin size-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
                </div>
              ) : groupedSessions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm">No chats found</p>
                </div>
              ) : (
                groupedSessions.map(([label, groupItems]) => (
                  <div key={label} className="mb-4">
                    {/* Group Label */}
                    <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
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
                              ? "text-foreground"
                              : "text-foreground/80 hover:text-foreground hover:bg-muted/50",
                            currentSessionId === session.id && "bg-muted border border-border"
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
                                className="h-6 text-xs bg-transparent border-border"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRename(session.id);
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                              />
                              <Check
                                className="size-4 text-accent-olive cursor-pointer shrink-0"
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
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 -mr-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreVertical className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-32 bg-popover border-border"
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
                                    className="text-destructive"
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
