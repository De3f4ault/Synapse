/**
 * AssistantSidebar - Session list for Dashboard Assistant
 * 
 * Compact session list using shared hooks.
 * Matches main chat sidebar styling.
 */

import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatSessionResponse } from "@/api/generated";

interface AssistantSidebarProps {
    sessions: ChatSessionResponse[];
    currentSessionId: number | null;
    onSelectSession: (sessionId: number) => void;
    onCreateSession: () => void;
    onDeleteSession: (sessionId: number, e: React.MouseEvent) => void;
    isInitializing: boolean;
}

/**
 * Format date for display
 */
function formatSessionDate(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function AssistantSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onCreateSession,
    onDeleteSession,
    isInitializing,
}: AssistantSidebarProps) {
    return (
        <div className="h-full flex flex-col bg-card/30">
            {/* New Chat Button */}
            <div className="p-3 border-b border-border/50">
                <Button
                    onClick={onCreateSession}
                    className="w-full justify-start gap-2 bg-muted/50 hover:bg-muted text-foreground border border-border/50 transition-all duration-300 group text-xs"
                    disabled={isInitializing}
                    variant="outline"
                >
                    <Plus className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
                    <span>New Session</span>
                </Button>
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {/* Label */}
                    <div className="px-2 py-1.5">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                            History
                        </p>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="text-center py-8 px-4 opacity-50">
                            <MessageCircle className="mx-auto h-6 w-6 mb-2 text-slate-500" />
                            <p className="text-xs text-slate-500">No sessions yet</p>
                        </div>
                    ) : (
                        sessions.map((session) => {
                            const isActive = currentSessionId === session.id;

                            return (
                                <div
                                    key={session.id}
                                    className={cn(
                                        "group relative flex items-center rounded-lg overflow-hidden transition-all duration-200 cursor-pointer",
                                        isActive ? "bg-white/10" : "hover:bg-white/5",
                                    )}
                                    onClick={() => onSelectSession(session.id)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "flex-1 justify-start gap-2 px-2 py-2 h-auto text-left font-normal",
                                            isActive
                                                ? "text-white"
                                                : "text-slate-400 hover:text-white hover:bg-transparent",
                                        )}
                                    >
                                        <MessageCircle
                                            className={cn(
                                                "h-3.5 w-3.5 shrink-0",
                                                isActive ? "text-cyan-400" : "text-slate-500",
                                            )}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium leading-tight line-clamp-2">
                                                {session.title || "New Conversation"}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                {formatSessionDate(session.updated_at)}
                                            </div>
                                        </div>
                                    </Button>

                                    {/* Delete Button */}
                                    <button
                                        className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 hover:bg-red-500/20 hover:text-red-400 text-slate-500 rounded transition-all"
                                        onClick={(e) => onDeleteSession(session.id, e)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export default AssistantSidebar;

