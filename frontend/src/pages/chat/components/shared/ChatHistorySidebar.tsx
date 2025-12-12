/**
 * ChatHistorySidebar - Synapse/DeepSeek Style
 * Minimal history navigation for Normal Mode
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Trash2, MoreHorizontal, Clock } from 'lucide-react';
import { useChatSessions, useDeleteSession } from '../../hooks/useChatSession';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatHistorySidebarProps {
    currentSessionId?: number;
    className?: string;
}

export function ChatHistorySidebar({ currentSessionId, className }: ChatHistorySidebarProps) {
    const navigate = useNavigate();
    const { data: sessions = [], isLoading } = useChatSessions();
    const deleteSession = useDeleteSession();

    // Group sessions by date
    const groupedSessions = React.useMemo(() => {
        const groups: Record<string, typeof sessions> = {
            'Today': [],
            'Yesterday': [],
            'Previous 7 Days': [],
            'Older': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        // Sort by date desc first
        const sorted = [...sessions].sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        sorted.forEach(session => {
            const date = new Date(session.updated_at);
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            if (dateOnly.getTime() === today.getTime()) {
                groups['Today'].push(session);
            } else if (dateOnly.getTime() === yesterday.getTime()) {
                groups['Yesterday'].push(session);
            } else if (dateOnly > lastWeek) {
                groups['Previous 7 Days'].push(session);
            } else {
                groups['Older'].push(session);
            }
        });

        return groups;
    }, [sessions]);

    const hasSessions = sessions.length > 0;

    return (
        <div className={cn("w-[260px] h-full flex flex-col bg-black/20 border-r border-white/5 backdrop-blur-sm", className)}>
            {/* Header / New Chat */}
            <div className="p-4 border-b border-white/5 shrink-0">
                <Button
                    onClick={() => navigate('/chat/new')}
                    className="w-full justify-start gap-2 bg-[var(--synapse-cyan)]/10 hover:bg-[var(--synapse-cyan)]/20 border border-[var(--synapse-cyan)]/20 text-[var(--synapse-text-primary)] hover:text-white transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                >
                    <Plus className="h-4 w-4 text-[var(--synapse-cyan)]" />
                    <span>New Chat</span>
                </Button>
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1">
                <div className="px-2 py-4 space-y-6">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-9 m-1 rounded bg-white/5 animate-pulse" />
                        ))
                    ) : !hasSessions ? (
                        <div className="text-center p-4 text-xs text-[var(--synapse-text-tertiary)]">
                            No recent chats
                        </div>
                    ) : (
                        Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                            groupSessions.length > 0 && (
                                <div key={groupName} className="space-y-1">
                                    <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--synapse-text-tertiary)] opacity-60 mb-2">
                                        {groupName}
                                    </div>
                                    {groupSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            onClick={() => navigate(`/chat/${session.id}?mode=normal`)}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm relative overflow-hidden",
                                                session.id === currentSessionId
                                                    ? "bg-white/10 text-white shadow-sm"
                                                    : "text-[var(--synapse-text-secondary)] hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {/* Active Indicator */}
                                            {session.id === currentSessionId && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--synapse-cyan)] rounded-r-full" />
                                            )}

                                            <span className="flex-1 truncate text-xs font-medium">{session.title || 'Untitled Chat'}</span>

                                            {/* Options Menu (Visible on Hover) */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1 rounded-md hover:bg-white/10 text-[var(--synapse-text-tertiary)] hover:text-white">
                                                            <MoreHorizontal className="h-3 w-3" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40 bg-[#0A0A0A] border-white/10 text-[var(--synapse-text-primary)]">
                                                        <DropdownMenuItem
                                                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                                            onClick={() => deleteSession.mutate(session.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
