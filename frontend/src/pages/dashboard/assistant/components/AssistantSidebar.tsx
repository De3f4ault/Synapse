/**
 * AssistantSidebar - Session list sidebar
 */

import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { NeumorphicButton } from "@/components/neumorphic";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    useAssistantSidebar,
    useAssistantSessionId,
    useAssistantSessions,
    useAssistantInitializing,
} from "../state";
import { useAssistant } from "../hooks";

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

export function AssistantSidebar() {
    const showSidebar = useAssistantSidebar();
    const sessionId = useAssistantSessionId();
    const sessions = useAssistantSessions();
    const isInitializing = useAssistantInitializing();
    const { createNewSession, switchSession, deleteSession } = useAssistant();

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteSession(id);
    };

    return (
        <div
            className={cn(
                "border-r border-border bg-card/50 transition-all duration-300 overflow-hidden flex flex-col",
                showSidebar ? "w-[180px]" : "w-0"
            )}
        >
            {/* New Chat Button */}
            <div className="p-3 border-b border-border">
                <NeumorphicButton
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs justify-start px-2"
                    onClick={createNewSession}
                    disabled={isInitializing}
                >
                    <Plus className="h-3 w-3 mr-2" />
                    New Session
                </NeumorphicButton>
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                "group relative p-2 rounded-lg cursor-pointer transition-all text-xs border border-transparent",
                                "hover:bg-muted/50",
                                session.id === sessionId
                                    ? "bg-foreground/5 border-border shadow-inner"
                                    : ""
                            )}
                            onClick={() => switchSession(session.id)}
                        >
                            <div className="flex items-start gap-2">
                                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate text-foreground/70">
                                        {session.title}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                        {formatSessionDate(session.updated_at)}
                                    </div>
                                </div>
                                <button
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 hover:text-destructive rounded transition-all"
                                    onClick={(e) => handleDelete(session.id, e)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
