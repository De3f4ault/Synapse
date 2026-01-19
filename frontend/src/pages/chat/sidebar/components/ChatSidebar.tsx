/**
 * ChatSidebar - Simplified & Dynamic
 *
 * Features:
 * - Logo and branding only
 * - Search functionality
 * - Recent/Archived sessions from backend
 * - No hardcoded data
 */

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  Search,
  MoreVertical,
  Share2,
  Pencil,
  Trash2,
  MessageCircle,
  Plus,
  Check,
  X,
  Bot,
  MessageSquare as ChatIcon,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useChatSessions,
  useDeleteSession,
  useCreateSession,
  useUpdateSession,
} from "../hooks/useChatSessions";
import { ChatService } from "@/api/generated";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchResultsPanel } from "../../search/components/SearchResultsPanel";

interface ChatSidebarProps {
  currentSessionId?: number;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type SessionFilter = "all" | "dashboard" | "chat";

/**
 * Helper to check if a session is dashboard-origin
 */
const isDashboardSession = (title: string | null | undefined): boolean => {
  if (!title) return false;
  const lower = title.toLowerCase();
  return lower.includes("dashboard") || lower.includes("assistant");
};

export function ChatSidebar({ currentSessionId, className, isCollapsed = false }: ChatSidebarProps) {
  const navigate = useNavigate();
  const { data: sessions = [] } = useChatSessions();
  const createSessionMutation = useCreateSession();
  const deleteSessionMutation = useDeleteSession();
  const updateSessionMutation = useUpdateSession();

  // Renaming state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SessionFilter>("chat");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search API query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["chat-search", debouncedSearch],
    queryFn: () => ChatService.searchConversationsApiV1ChatSearchGet(debouncedSearch, 20, false),
    enabled: debouncedSearch.length >= 2,
    staleTime: 1000 * 30,
  });

  // Export handler
  const handleExport = async (sessionId: number, format: "json" | "markdown", e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await ChatService.exportConversationApiV1ChatSessionsSessionIdExportGet(sessionId, format, false);
      // Create download link
      const blob = new Blob([typeof response === 'string' ? response : JSON.stringify(response, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/markdown'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation_${sessionId}.${format === 'json' ? 'json' : 'md'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Filter sessions based on source
  const filteredSessions = useMemo(() => {
    switch (sourceFilter) {
      case "dashboard":
        return sessions.filter((s) => isDashboardSession(s.title));
      case "chat":
        return sessions.filter((s) => !isDashboardSession(s.title));
      default:
        return sessions;
    }
  }, [sessions, sourceFilter]);

  // Note: Archive functionality not yet implemented in backend
  const recentChats = filteredSessions;

  const handleCreateSession = () => {
    createSessionMutation.mutate({ title: "New Chat" });
  };

  const handleDeleteSession = (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const startRenaming = (session: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(session.id);
    setRenameValue(session.title || "New Chat");
  };

  const saveRename = (sessionId: number) => {
    if (!renameValue.trim()) return;
    updateSessionMutation.mutate({ sessionId, data: { title: renameValue } });
    setRenamingId(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col bg-zinc-950/40 backdrop-blur-3xl border-r border-white/10 rounded-none overflow-hidden transition-all duration-300 ease-in-out",
        className,
      )}
    >
      <div className="flex flex-col h-full w-full">
        {/* Header / New Chat */}
        <div className="p-4 border-b border-white/10 shrink-0 space-y-4">
           {/* Logo & Toggle Row */}
           <div className={cn("flex items-center justify-between", isCollapsed && "justify-center")}>
              <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
                  <div className="size-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Bot className="size-5 text-white" />
                  </div>
                  <span className="font-bold text-lg tracking-tight text-white">Synapse</span>
              </div>
           </div>

          {/* Hero New Chat Button */}
          <button
            onClick={handleCreateSession}
            className={cn(
              "relative w-full overflow-hidden group border border-dashed rounded-xl transition-all duration-300",
              isCollapsed 
                ? "aspect-square rounded-full flex items-center justify-center p-0 border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50" 
                : "p-4 text-left border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-900/10"
            )}
            title="Start New Conversation"
          >
            {/* Hover Gradient Overlay */}
            {!isCollapsed && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
            
            <div className={cn("relative z-10 flex flex-col", isCollapsed && "items-center")}>
               <div className={cn(
                  "inline-flex items-center justify-center rounded-lg transition-colors duration-300",
                  isCollapsed ? "size-6 text-white" : "p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 mb-3 group-hover:scale-110 origin-left transform transition-transform"
               )}>
                  <Plus className={cn("size-5", isCollapsed && "size-5")} />
               </div>
               
               {!isCollapsed && (
                 <>
                  <h3 className="font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">New Chat</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed group-hover:text-zinc-400">
                    Explore a new topic or idea
                  </p>
                 </>
               )}
            </div>
          </button>
        </div>

        {/* Search - Refined */}
        {!isCollapsed && (
          <div className="p-3 shrink-0">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-9 bg-white/5 border-white/5 focus:border-cyan-500/50 focus:ring-0 text-xs transition-all"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-cyan-400 animate-spin" />
              )}
            </div>
          </div>
        )}

        <Separator className="bg-white/5 shrink-0" />

        {/* Source Filter Toggle */}
        <div className="px-3 py-2 shrink-0">
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setSourceFilter("all")}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium uppercase tracking-wide transition-all",
                sourceFilter === "all"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSourceFilter("dashboard")}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium uppercase tracking-wide transition-all flex items-center justify-center gap-1",
                sourceFilter === "dashboard"
                  ? "bg-zinc-800 text-cyan-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Bot size={10} />
              Dash
            </button>
            <button
              onClick={() => setSourceFilter("chat")}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium uppercase tracking-wide transition-all flex items-center justify-center gap-1",
                sourceFilter === "chat"
                  ? "bg-zinc-800 text-purple-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <ChatIcon size={10} />
              Chat
            </button>
          </div>
        </div>

        <Separator className="bg-white/5 shrink-0" />

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {/* Intelligent Grouped Search Results */}
          {searchQuery.length >= 2 && (
            <>
              <SearchResultsPanel
                results={searchResults}
                query={searchQuery}
                isLoading={isSearching}
                searchMode="global"
                recentSessions={recentChats.slice(0, 5).map(s => ({ id: s.id, title: s.title || 'Untitled' }))}
                onQueryChange={setSearchQuery}
                onResultClick={(session, query) => {
                  // Pass query in URL for auto-activation of IDE search
                  const params = new URLSearchParams();
                  params.set('q', query);
                  navigate(`/chat/${session.sessionId}?${params.toString()}`);
                }}
              />
              {searchResults.length > 0 && <Separator className="bg-white/5 my-2" />}
            </>
          )}

          {/* Recent Chats */}
          {recentChats.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2">
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-semibold">
                  History
                </p>
              </div>
              {recentChats.map((session) => {
                const isActive = currentSessionId === session.id;
                const isRenaming = renamingId === session.id;

                return (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative flex items-center transition-all duration-200 rounded-xl cursor-pointer p-2",
                      isActive 
                        ? "bg-cyan-500/10 border border-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                        : "hover:bg-white/5 border border-transparent",
                    )}
                  >
                    {isRenaming ? (
                      <div className="flex-1 flex items-center gap-1 p-1 pl-2">
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(session.id);
                            if (e.key === "Escape") cancelRename();
                          }}
                          className="h-7 text-xs bg-black/50 border-cyan-500/50 focus-visible:ring-0 text-white"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-400 hover:bg-green-500/20"
                          onClick={() => saveRename(session.id)}
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:bg-red-500/20"
                          onClick={cancelRename}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className={cn(
                            "flex-1 justify-start gap-3 px-2 py-0 h-auto text-left font-normal hover:bg-transparent",
                            isActive
                              ? "text-cyan-100"
                              : "text-zinc-400 group-hover:text-zinc-200",
                          )}
                          onClick={() => navigate(`/chat/${session.id}`)}
                        >
                          <MessageCircle
                            className={cn(
                              "size-4 shrink-0 transition-colors",
                              isActive ? "fill-cyan-500/20 stroke-cyan-400" : "stroke-zinc-500 group-hover:stroke-zinc-300",
                            )}
                          />
                          <span className="truncate text-sm font-medium leading-none py-1">
                            {session.title || "New Conversation"}
                          </span>
                        </Button>

                        {!isRenaming && isActive && (
                           <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0 mr-2" />
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity",
                                isActive && "opacity-100",
                              )}
                            >
                              <MoreVertical className="size-3 text-zinc-400 hover:text-white" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-[#0a0a0a] border-white/10 text-slate-300"
                          >
                            <DropdownMenuItem
                              onClick={(e) => startRenaming(session, e)}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <Pencil className="size-4 mr-2" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                              <Share2 className="size-4 mr-2" />
                              <span>Share</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                              onClick={(e) => handleExport(session.id, 'json', e)}
                            >
                              <Download className="size-4 mr-2" />
                              <span>Export JSON</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                              onClick={(e) => handleExport(session.id, 'markdown', e)}
                            >
                              <Download className="size-4 mr-2" />
                              <span>Export Markdown</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                              onClick={(e) => handleDeleteSession(session.id, e)}
                            >
                              <Trash2 className="size-4 mr-2" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State - Now correctly checks filtered results */}
          {recentChats.length === 0 && !isSearching && sessions.length > 0 && (
             <div className="text-center py-12 px-4 opacity-50">
               <div className="mx-auto size-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                 <Search className="size-5 text-zinc-600" />
               </div>
               <p className="text-xs text-zinc-500">No chats found in this category</p>
               <button onClick={() => setSourceFilter('all')} className="mt-2 text-[10px] text-cyan-500 hover:underline">
                 View all chats
               </button>
             </div>
          )}

          {/* True Empty State (No sessions at all) */}
          {sessions.length === 0 && (
            <div className="text-center py-12 px-4 opacity-50">
              <MessageCircle className="mx-auto h-8 w-8 mb-2 text-zinc-600" />
              <p className="text-xs text-zinc-500">No conversations yet</p>
            </div>
          )}
      </div>
    </div>
    </div>
  );
}
