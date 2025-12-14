/**
 * ChatPage - Auto-Navigation & Retractable Sidebar
 * 
 * Features:
 * - Auto-redirects to latest session
 * - Auto-creates first session if none exist
 * - Retractable sidebar with localStorage persistence
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatSidebar } from './components/chat-sidebar';
import { ChatMain } from './components/chat-main';
import { GridPattern } from '@/components/ui/grid-pattern';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MenuIcon, PanelLeftIcon } from 'lucide-react';
import { useChatSessions, useCreateSession } from './hooks/useChatSession';
import { cn } from '@/lib/utils';

export const ChatPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Fetch sessions and handle auto-navigation
    const { data: sessions = [], isLoading } = useChatSessions();
    const createSessionMutation = useCreateSession();
    const numericSessionId = sessionId ? parseInt(sessionId) : undefined;

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved));
        }
    }, []);

    // Auto-navigation logic
    useEffect(() => {
        if (isLoading) return;

        if (!sessionId) {
            if (sessions.length > 0) {
                // Sort by updated_at DESC and redirect to latest
                const sortedSessions = [...sessions].sort((a, b) => {
                    const aDate = new Date(a.updated_at || a.created_at).getTime();
                    const bDate = new Date(b.updated_at || b.created_at).getTime();
                    return bDate - aDate;
                });
                const latest = sortedSessions[0];
                if (latest) {
                    navigate(`/chat/${latest.id}`, { replace: true });
                }
            } else {
                // No sessions exist - create first one
                createSessionMutation.mutate(
                    { title: 'New Conversation' },
                    {
                        onSuccess: (newSession) => {
                            navigate(`/chat/${newSession.id}`, { replace: true });
                        },
                    }
                );
            }
        }
    }, [sessionId, sessions, isLoading, navigate, createSessionMutation]);

    // Toggle sidebar
    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    // Show loading state during auto-navigation
    if (isLoading || !numericSessionId) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-2">
                    <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar - Retractable */}
            <div
                className={cn(
                    "hidden md:block border-r border-border transition-all duration-300 ease-in-out",
                    sidebarCollapsed ? "w-0" : "w-64"
                )}
            >
                <div className={cn("h-full", sidebarCollapsed && "opacity-0")}>
                    <ChatSidebar currentSessionId={numericSessionId} />
                </div>
            </div>

            {/* Mobile Sidebar (Drawer) */}
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetContent
                    side="left"
                    className="w-64 p-0 border-none [&>button]:hidden"
                >
                    <ChatSidebar currentSessionId={numericSessionId} />
                </SheetContent>
            </Sheet>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header with Toggle */}
                <div className="flex items-center justify-between border-b border-border px-4 h-14 bg-background z-20">
                    {/* Desktop Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="hidden md:flex"
                    >
                        <PanelLeftIcon className="size-5" />
                    </Button>

                    {/* Mobile Hamburger */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileSidebarOpen(true)}
                        className="md:hidden"
                    >
                        <MenuIcon className="size-5" />
                    </Button>

                    <div className="flex-1" />
                </div>

                {/* Chat Interface with Grid Background */}
                <div className="flex-1 overflow-hidden relative">
                    <GridPattern className="pointer-events-none" />

                    <div className="relative z-10 h-full">
                        <ChatMain sessionId={numericSessionId} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
