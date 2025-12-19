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
import { useState } from "react";
import {
    Search,
    MoreVertical,
    Share2,
    Pencil,
    Archive,
    ArchiveRestore,
    Trash2,
    MessageCircle,
    Plus,
    Check,
    X
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
import { useChatSessions, useDeleteSession, useCreateSession, useUpdateSession } from "../hooks/useChatSession";

interface ChatSidebarProps {
    currentSessionId?: number;
    className?: string;
}

export function ChatSidebar({ currentSessionId, className }: ChatSidebarProps) {
    const navigate = useNavigate();
    const { data: sessions = [] } = useChatSessions();
    const createSessionMutation = useCreateSession();
    const deleteSessionMutation = useDeleteSession();
    const updateSessionMutation = useUpdateSession();

    // Renaming state
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState("");

    // Note: Archive functionality not yet implemented in backend
    const recentChats = sessions;
    const archivedChats: typeof sessions = [];

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
        <div className={cn("flex h-full w-full flex-col bg-black/20 backdrop-blur-xl border-r border-white/10", className)}>
            {/* Header / New Chat */}
            <div className="p-4 border-b border-white/10">
                <Button
                    onClick={handleCreateSession}
                    className="w-full justify-start gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group"
                >
                    <Plus className="size-4 group-hover:text-cyan-400 transition-colors" />
                    <span>New Chat</span>
                </Button>
            </div>

            {/* Search - Refined */}
            <div className="p-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <Input
                        placeholder="Search conversations..."
                        className="pl-9 pr-4 h-9 bg-white/5 border-white/5 focus:border-cyan-500/50 focus:ring-0 text-xs transition-all"
                    />
                </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">

                {/* Recent Chats */}
                {recentChats.length > 0 && (
                    <div className="space-y-1">
                        <div className="px-3 py-2">
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
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
                                        "group relative flex items-center rounded-lg overflow-hidden transition-all duration-200",
                                        isActive ? "bg-white/10" : "hover:bg-white/5"
                                    )}
                                >
                                    {isRenaming ? (
                                        <div className="flex-1 flex items-center gap-1 p-1 pl-2">
                                            <Input
                                                autoFocus
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveRename(session.id);
                                                    if (e.key === 'Escape') cancelRename();
                                                }}
                                                className="h-7 text-xs bg-black/50 border-cyan-500/50 focus-visible:ring-0"
                                            />
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:bg-green-500/20" onClick={() => saveRename(session.id)}>
                                                <Check size={14} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-red-500/20" onClick={cancelRename}>
                                                <X size={14} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "flex-1 justify-start gap-3 px-3 py-2 h-auto text-left font-normal",
                                                    isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
                                                )}
                                                onClick={() => navigate(`/chat/${session.id}`)}
                                            >
                                                <MessageCircle className={cn("size-4 shrink-0 transition-colors", isActive && "fill-cyan-500/20 stroke-cyan-400")} />
                                                <span className="truncate text-sm">
                                                    {session.title || "New Conversation"}
                                                </span>
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn(
                                                            "h-8 w-8 mr-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity",
                                                            isActive && "opacity-100"
                                                        )}
                                                    >
                                                        <MoreVertical className="size-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-[#0a0a0a] border-white/10 text-slate-300">
                                                    <DropdownMenuItem onClick={(e) => startRenaming(session, e)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                        <Pencil className="size-4 mr-2" />
                                                        <span>Rename</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                        <Share2 className="size-4 mr-2" />
                                                        <span>Share</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                        <Archive className="size-4 mr-2" />
                                                        <span>Archive</span>
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

                {/* Empty State */}
                {sessions.length === 0 && (
                    <div className="text-center py-12 px-4 opacity-50">
                        <MessageCircle className="mx-auto h-8 w-8 mb-2 text-slate-600" />
                        <p className="text-xs text-slate-500">
                            No conversations yet
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
