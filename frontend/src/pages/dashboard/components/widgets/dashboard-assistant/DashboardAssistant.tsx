/**
 * DashboardAssistant - Refactored Floating Chat Widget
 *
 * Features:
 * - WebSocket streaming for real-time responses
 * - Uses shared hooks from @/modules/chat
 * - Componentized architecture
 * - Glassmorphic styling matching main chat page
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import {
    useChatSessions,
    useChatMessages,
    useCreateSession,
    useDeleteSession,
    useChatStreaming,
    useTitleGeneration,
} from "@/modules/chat";

import { AssistantHeader } from "./AssistantHeader";
import { AssistantSidebar } from "./AssistantSidebar";
import { AssistantQuickActions } from "./AssistantQuickActions";
import { AssistantMessages } from "./AssistantMessages";
import { AssistantInput } from "./AssistantInput";

interface DashboardAssistantProps {
    className?: string;
}

const STORAGE_KEY = "synapse_dashboard_session_id";
const SIDEBAR_KEY = "synapse_dashboard_sidebar_open";

/**
 * Helper to check if a session is dashboard-origin
 */
const isDashboardSession = (title: string | null | undefined): boolean => {
    if (!title) return false;
    const lower = title.toLowerCase();
    return lower.includes("dashboard") || lower.includes("assistant");
};

export function DashboardAssistant({ className }: DashboardAssistantProps) {
    // Widget state
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showSidebar, setShowSidebar] = useState(() => {
        const stored = localStorage.getItem(SIDEBAR_KEY);
        return stored ? JSON.parse(stored) : true;
    });
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Shared hooks
    const { data: sessions = [] } = useChatSessions();
    const { data: messages = [] } = useChatMessages(sessionId ?? undefined);
    const createSessionMutation = useCreateSession({ autoNavigate: false });
    const deleteSessionMutation = useDeleteSession({ autoNavigate: false });
    const { generateAndUpdateTitle } = useTitleGeneration();

    // Filter to only show dashboard sessions
    const dashboardSessions = useMemo(
        () => sessions.filter((s) => isDashboardSession(s.title)),
        [sessions]
    );

    // Streaming hook
    const {
        isConnected,
        isStreaming,
        streamingContent,
        sendMessage,
    } = useChatStreaming({
        sessionId: sessionId ?? undefined,
        autoConnect: isOpen,
    });

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            setIsInitializing(true);
            const storedId = localStorage.getItem(STORAGE_KEY);

            if (storedId) {
                const id = parseInt(storedId);
                setSessionId(id);
                setIsInitializing(false);
            } else if (dashboardSessions.length > 0) {
                // Use first available dashboard session
                const firstSession = dashboardSessions[0]!;
                setSessionId(firstSession.id);
                localStorage.setItem(STORAGE_KEY, firstSession.id.toString());
                setIsInitializing(false);
            } else {
                // Create new session
                try {
                    const session = await createSessionMutation.mutateAsync({
                        title: "Dashboard Assistant",
                    });
                    setSessionId(session.id);
                    localStorage.setItem(STORAGE_KEY, session.id.toString());
                } catch (error) {
                    console.error("Failed to create session:", error);
                }
                setIsInitializing(false);
            }
        };

        if (isOpen) {
            initSession();
        }
    }, [isOpen, dashboardSessions.length]);

    // Toggle sidebar and persist
    const toggleSidebar = () => {
        const newState = !showSidebar;
        setShowSidebar(newState);
        localStorage.setItem(SIDEBAR_KEY, JSON.stringify(newState));
    };

    // Handle session selection
    const handleSelectSession = (newSessionId: number) => {
        setSessionId(newSessionId);
        localStorage.setItem(STORAGE_KEY, newSessionId.toString());
    };

    // Handle session creation
    const handleCreateSession = async () => {
        try {
            const session = await createSessionMutation.mutateAsync({
                title: "Dashboard Assistant",
            });
            setSessionId(session.id);
            localStorage.setItem(STORAGE_KEY, session.id.toString());
        } catch (error) {
            console.error("Failed to create session:", error);
        }
    };

    // Handle session deletion
    const handleDeleteSession = async (sessionIdToDelete: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteSessionMutation.mutateAsync(sessionIdToDelete);

            // If deleting current session, create new one
            if (sessionIdToDelete === sessionId) {
                await handleCreateSession();
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    };

    // Send message handler
    const handleSend = async (content: string) => {
        if (!content.trim() || !sessionId || !isConnected) return;

        try {
            sendMessage(content);

            // Generate title if first message
            const userMessagesCount = messages.filter((m) => m.role === "user").length;
            if (userMessagesCount === 0) {
                await generateAndUpdateTitle(sessionId, content);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    // Quick action handler
    const handleQuickAction = (prompt: string) => {
        handleSend(prompt);
    };

    // Minimized state - floating button
    if (isMinimized) {
        return (
            <Button
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in p-0 bg-primary hover:bg-primary/90"
                onClick={() => setIsMinimized(false)}
            >
                <BrainCircuit className="h-6 w-6" />
            </Button>
        );
    }

    // Closed state - floating button
    if (!isOpen) {
        return (
            <Button
                className={cn(
                    "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
                    "animate-in fade-in zoom-in p-0",
                    "bg-primary hover:bg-primary/90",
                    "transition-all duration-300",
                    className,
                )}
                onClick={() => setIsOpen(true)}
            >
                <BrainCircuit className="h-6 w-6" />
            </Button>
        );
    }

    // Open state - full widget
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
            />

            {/* Widget */}
            <Card
                ref={wrapperRef}
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 ease-in-out p-0 overflow-hidden",
                    "h-[720px] bg-background/95 backdrop-blur-xl border border-border/50",
                    "animate-in slide-in-from-bottom-4 fade-in duration-300",
                    showSidebar ? "w-[700px]" : "w-[480px]",
                    className,
                )}
            >
                {/* Grid Pattern Background */}
                <GridPattern className="pointer-events-none" />
                {/* Header */}
                <AssistantHeader
                    showSidebar={showSidebar}
                    onToggleSidebar={toggleSidebar}
                    onClose={() => setIsOpen(false)}
                    isConnected={isConnected}
                    isInitializing={isInitializing}
                />

                <div className="flex flex-1 overflow-hidden relative z-10">
                    {/* Sidebar */}
                    <div
                        className={cn(
                            "border-r border-white/10 transition-all duration-300 overflow-hidden bg-black/20 backdrop-blur-sm",
                            showSidebar ? "w-[220px]" : "w-0",
                        )}
                    >
                        <AssistantSidebar
                            sessions={dashboardSessions}
                            currentSessionId={sessionId}
                            onSelectSession={handleSelectSession}
                            onCreateSession={handleCreateSession}
                            onDeleteSession={handleDeleteSession}
                            isInitializing={isInitializing}
                        />
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                        {/* Quick Actions */}
                        <AssistantQuickActions
                            onAction={handleQuickAction}
                            disabled={isStreaming || isInitializing || !isConnected}
                        />

                        {/* Messages */}
                        <AssistantMessages
                            messages={messages}
                            isTyping={isStreaming}
                            streamingContent={streamingContent}
                        />

                        {/* Input */}
                        <AssistantInput
                            onSend={handleSend}
                            disabled={isInitializing || !sessionId}
                            isLoading={isStreaming}
                        />
                    </div>
                </div>
            </Card>
        </>
    );
}

export default DashboardAssistant;
