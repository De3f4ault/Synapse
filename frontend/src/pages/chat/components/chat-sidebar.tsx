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
import {
    SearchIcon,
    MoreVerticalIcon,
    Share2Icon,
    PencilIcon,
    ArchiveIcon,
    ArchiveRestoreIcon,
    Trash2Icon,
    MessageCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useChatSessions, useDeleteSession } from "../hooks/useChatSession";

interface ChatSidebarProps {
    currentSessionId?: number;
    className?: string;
}

export function ChatSidebar({ currentSessionId, className }: ChatSidebarProps) {
    const navigate = useNavigate();
    const { data: sessions = [] } = useChatSessions();
    const deleteSessionMutation = useDeleteSession();

    // Note: Archive functionality not yet implemented in backend
    const recentChats = sessions;
    const archivedChats: typeof sessions = [];

    const handleDeleteSession = (sessionId: number) => {
        if (confirm("Are you sure you want to delete this conversation?")) {
            deleteSessionMutation.mutate(sessionId);
        }
    };

    return (
        <div className={cn("flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border", className)}>
            {/* Simple Header */}
            <div className="flex items-center gap-2.5 p-3 border-b border-sidebar-border">
                <Logo className="size-6" />
                <span className="font-semibold text-sm">Synapse</span>
            </div>

            {/* Search */}
            <div className="p-3">
                <div className="relative flex items-center">
                    <SearchIcon className="absolute left-3 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations"
                        className="pl-9 pr-10 h-[34px] bg-muted/50"
                    />
                    <div className="absolute right-2 flex items-center justify-center size-5 rounded bg-muted text-xs text-muted-foreground">
                        /
                    </div>
                </div>
            </div>

            <Separator />

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="p-3 space-y-4">
                    {/* Recent Chats */}
                    {recentChats.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 py-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Recent
                                </p>
                            </div>
                            {recentChats.map((session) => {
                                const isActive = currentSessionId === session.id;
                                return (
                                    <div
                                        key={session.id}
                                        className={cn(
                                            "group/item relative flex items-center rounded-md overflow-hidden",
                                            isActive && "bg-sidebar-accent"
                                        )}
                                    >
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "flex-1 justify-start gap-2 px-2 text-left h-auto py-1.5 min-w-0 pr-8",
                                                isActive ? "hover:bg-sidebar-accent" : "hover:bg-accent"
                                            )}
                                            onClick={() => navigate(`/chat/${session.id}`)}
                                        >
                                            <MessageCircleIcon className="size-4 shrink-0" />
                                            <span className="text-sm truncate min-w-0">
                                                {session.title || "New Chat"}
                                            </span>
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute right-1 size-7 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                                                >
                                                    <MoreVerticalIcon className="size-4" />
                                                    <span className="sr-only">More</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                className="w-48"
                                                side="right"
                                                align="start"
                                            >
                                                <DropdownMenuItem>
                                                    <Share2Icon className="size-4 text-muted-foreground" />
                                                    <span>Share</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <PencilIcon className="size-4 text-muted-foreground" />
                                                    <span>Rename</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <ArchiveIcon className="size-4 text-muted-foreground" />
                                                    <span>Archive</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleDeleteSession(session.id)}
                                                >
                                                    <Trash2Icon className="size-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Archived Chats */}
                    {archivedChats.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 py-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Archived
                                </p>
                            </div>
                            {archivedChats.map((session) => {
                                const isActive = currentSessionId === session.id;
                                return (
                                    <div
                                        key={session.id}
                                        className={cn(
                                            "group/item relative flex items-center rounded-md overflow-hidden",
                                            isActive && "bg-sidebar-accent"
                                        )}
                                    >
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "flex-1 justify-start gap-2 px-2 text-left h-auto py-1.5 min-w-0 pr-8",
                                                isActive ? "hover:bg-sidebar-accent" : "hover:bg-accent"
                                            )}
                                            onClick={() => navigate(`/chat/${session.id}`)}
                                        >
                                            <MessageCircleIcon className="size-4 shrink-0" />
                                            <span className="text-sm truncate min-w-0">
                                                {session.title || "New Chat"}
                                            </span>
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute right-1 size-7 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                                                >
                                                    <MoreVerticalIcon className="size-4" />
                                                    <span className="sr-only">More</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                className="w-48"
                                                side="right"
                                                align="start"
                                            >
                                                <DropdownMenuItem>
                                                    <Share2Icon className="size-4 text-muted-foreground" />
                                                    <span>Share</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <PencilIcon className="size-4 text-muted-foreground" />
                                                    <span>Rename</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <ArchiveRestoreIcon className="size-4 text-muted-foreground" />
                                                    <span>Unarchive</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleDeleteSession(session.id)}
                                                >
                                                    <Trash2Icon className="size-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {sessions.length === 0 && (
                        <div className="text-center py-8 px-4">
                            <p className="text-sm text-muted-foreground">
                                No conversations yet
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
