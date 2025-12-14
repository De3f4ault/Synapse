import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, Minimize2, Zap, Target, Lightbulb, Loader2, ChevronLeft, ChevronRight, Plus, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionsList } from './ActionResultCard';
import { useAuthStore } from '@/stores/authStore';
import { ChatService } from '@/api/generated';
import type { ChatSessionResponse } from '@/api/generated';

interface DashboardAssistantProps {
    className?: string;
}

// Local message type to handle both optimistic and server messages
interface UIMessage {
    id: string | number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
    actions?: Array<{
        type: string;
        data: Record<string, any>;
        message: string;
    }>;
}

const STORAGE_KEY = 'synapse_dashboard_session_id';
const SIDEBAR_KEY = 'synapse_dashboard_sidebar_open';

// Counter to ensure unique error IDs
let errorIdCounter = 0;

// Welcome message
const WELCOME_MESSAGE: UIMessage = {
    role: 'assistant',
    content: "Hello! I'm monitoring your learning progress. Ask me about your weak areas or what to study next.",
    id: 'init',
    timestamp: new Date().toISOString(),
};

export const DashboardAssistant: React.FC<DashboardAssistantProps> = ({ className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showSidebar, setShowSidebar] = useState(() => {
        const stored = localStorage.getItem(SIDEBAR_KEY);
        return stored ? JSON.parse(stored) : true;
    });
    const [sessions, setSessions] = useState<ChatSessionResponse[]>([]);
    const [messages, setMessages] = useState<UIMessage[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Get authentication token from store
    const token = useAuthStore((state) => state.token);

    // Load chat history
    const loadChatHistory = async (sessionId: number) => {
        setHistoryLoaded(false);

        try {
            const history = await ChatService.getMessagesApiV1ChatSessionsSessionIdMessagesGet(
                sessionId,
                50
            );

            if (history && history.length > 0) {
                const uiMessages: UIMessage[] = history.map(msg => ({
                    id: msg.id || `msg-${Date.now()}`,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content || '',
                    timestamp: msg.created_at,
                    actions: msg.function_calls?.actions_taken || []
                }));

                setMessages([WELCOME_MESSAGE, ...uiMessages]);
            } else {
                setMessages([WELCOME_MESSAGE]);
            }
            setHistoryLoaded(true);
        } catch (error) {
            console.error("Failed to load chat history", error);
            setMessages([WELCOME_MESSAGE]);
            setHistoryLoaded(true);
        }
    };

    // Load sessions list
    const loadSessions = async () => {
        try {
            const allSessions = await ChatService.listSessionsApiV1ChatSessionsGet(1, 20);
            // Filter to only Dashboard Assistant sessions
            const dashboardSessions = allSessions.filter(s =>
                s.title.includes('Dashboard') || s.title.includes('Assistant')
            );
            setSessions(dashboardSessions);
        } catch (error) {
            console.error("Failed to load sessions", error);
        }
    };

    // Create new session
    const createNewSession = async () => {
        try {
            const session = await ChatService.createSessionApiV1ChatSessionsPost({
                title: 'Dashboard Assistant',
            });
            if (session.id) {
                setSessions(prev => [session, ...prev]);
                await switchSession(session.id);
            }
        } catch (error) {
            console.error("Failed to create session", error);
        }
    };

    // Switch to different session
    const switchSession = async (newSessionId: number) => {
        setSessionId(newSessionId);
        localStorage.setItem(STORAGE_KEY, newSessionId.toString());
        await loadChatHistory(newSessionId);
    };

    // Delete session
    const deleteSession = async (sessionIdToDelete: number, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            await ChatService.deleteSessionApiV1ChatSessionsSessionIdDelete(sessionIdToDelete);
            setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));

            // If deleting current session, create new one
            if (sessionIdToDelete === sessionId) {
                await createNewSession();
            }
        } catch (error) {
            console.error("Failed to delete session", error);
        }
    };

    // Toggle sidebar and persist
    const toggleSidebar = () => {
        const newState = !showSidebar;
        setShowSidebar(newState);
        localStorage.setItem(SIDEBAR_KEY, JSON.stringify(newState));
    };

    // Initialize session and load sessions
    useEffect(() => {
        const initSession = async () => {
            const storedId = localStorage.getItem(STORAGE_KEY);
            if (storedId) {
                const id = parseInt(storedId);
                setSessionId(id);
                if (isOpen) {
                    await loadChatHistory(id);
                }
                setIsInitializing(false);
            } else {
                setIsInitializing(true);
                await createNewSession();
                setIsInitializing(false);
            }

            // Load sessions list
            await loadSessions();
        };
        initSession();
    }, []);

    // Load history when widget opens
    useEffect(() => {
        if (isOpen && sessionId && !historyLoaded) {
            loadChatHistory(sessionId);
        }
    }, [isOpen, sessionId]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && !isMinimized && wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isMinimized]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: UIMessage = {
            role: 'user',
            content: input,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        if (!token) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "You need to be logged in to use the dashboard assistant. Please log in first.",
                id: `error-auth-${Date.now()}-${++errorIdCounter}`,
                timestamp: new Date().toISOString()
            }]);
            setIsTyping(false);
            return;
        }

        try {
            const response = await fetch('/api/v1/chat/sessions/dashboard/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: userMsg.content })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.content) {
                const botMsg: UIMessage = {
                    role: 'assistant',
                    content: data.content,
                    id: data.id,
                    timestamp: data.created_at,
                    actions: data.function_calls?.actions_taken || []
                };
                setMessages(prev => [...prev, botMsg]);

                if (data.session_id && !sessionId) {
                    setSessionId(data.session_id);
                    localStorage.setItem(STORAGE_KEY, data.session_id.toString());
                }

                // Refresh sessions list
                loadSessions();
            }
        } catch (error) {
            console.error("Dashboard AI error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I encountered an error processing your request. Please try again.",
                id: `error-api-${Date.now()}-${++errorIdCounter}`,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickAction = async (prompt: string) => {
        setInput(prompt);
        setTimeout(() => {
            handleSend();
        }, 100);
    };

    // Format date for session
    const formatSessionDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Minimized state
    if (isMinimized) {
        return (
            <Button
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in"
                onClick={() => setIsMinimized(false)}
            >
                <Bot className="h-6 w-6" />
            </Button>
        );
    }

    // Closed state
    if (!isOpen) {
        return (
            <Button
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in"
                onClick={() => setIsOpen(true)}
            >
                <Bot className="h-6 w-6" />
            </Button>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-40 animate-in fade-in duration-200" />

            <Card
                ref={wrapperRef}
                className={cn(
                    "fixed bottom-6 right-6 shadow-2xl border-primary/20 z-50 flex flex-col transition-all duration-300 ease-in-out",
                    "h-[680px] flex flex-col overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                    "animate-in slide-in-from-bottom-4 fade-in duration-300",
                    showSidebar ? "w-[600px]" : "w-[420px]",
                    className
                )}
            >
                {/* Header */}
                <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-4 px-4 flex flex-row items-center justify-between space-y-0 border-b">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 rounded-lg"
                            onClick={toggleSidebar}
                        >
                            {showSidebar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <div className="bg-primary/20 p-2 rounded-lg ring-1 ring-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.3)]">
                            <Sparkles className="h-4 w-4 text-primary fill-primary/20" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold tracking-tight">Synapse Assistant</CardTitle>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    {isInitializing ? (
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500 animate-pulse"></span>
                                    ) : (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                        </>
                                    )}
                                </span>
                                {isInitializing ? 'Establishing Link...' : 'System Online'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors rounded-full"
                        onClick={() => setIsOpen(false)}
                    >
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className={cn(
                        "border-r bg-muted/30 transition-all duration-300 overflow-hidden flex flex-col",
                        showSidebar ? "w-[180px]" : "w-0"
                    )}>
                        {/* New Chat Button */}
                        <div className="p-2 border-b">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={createNewSession}
                                disabled={isInitializing}
                            >
                                <Plus className="h-3 w-3" />
                                New Chat
                            </Button>
                        </div>

                        {/* Session List */}
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className={cn(
                                            "group relative p-2 rounded-lg cursor-pointer transition-colors text-xs",
                                            "hover:bg-muted",
                                            session.id === sessionId && "bg-primary/10 border border-primary/20"
                                        )}
                                        onClick={() => switchSession(session.id)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {session.title}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {formatSessionDate(session.updated_at)}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded"
                                                onClick={(e) => deleteSession(session.id, e)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Quick Actions Bar */}
                        <div className="px-3 py-2 border-b bg-muted/30 flex gap-2 overflow-x-auto scrollbar-hide">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                                onClick={() => handleQuickAction("Create flashcards for my weak areas")}
                                disabled={isTyping || isInitializing}
                            >
                                <Zap className="h-3 w-3" />
                                Flashcards
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                                onClick={() => handleQuickAction("What are my weak areas?")}
                                disabled={isTyping || isInitializing}
                            >
                                <Target className="h-3 w-3" />
                                Weak Areas
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                                onClick={() => handleQuickAction("Suggest topics to study next")}
                                disabled={isTyping || isInitializing}
                            >
                                <Lightbulb className="h-3 w-3" />
                                Study Tips
                            </Button>
                        </div>

                        {/* Messages */}
                        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                            <ScrollArea className="flex-1 p-4 pr-5 h-full w-full">
                                <div className="space-y-6 pb-2">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                                msg.role === 'user' ? "bg-primary/10 border-primary/20" : "bg-card border-border"
                                            )}>
                                                {msg.role === 'user' ? (
                                                    <div className="h-4 w-4 rounded-full bg-primary/50" />
                                                ) : (
                                                    <Bot className="h-4 w-4 text-primary" />
                                                )}
                                            </div>

                                            <div className={cn(
                                                "flex flex-col gap-1 max-w-[80%]",
                                                msg.role === 'user' ? "items-end" : "items-start"
                                            )}>
                                                <div className={cn(
                                                    "rounded-2xl px-4 py-3 text-sm shadow-sm border",
                                                    msg.role === 'user'
                                                        ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-sm"
                                                        : "bg-card border-border/50 text-foreground/90 rounded-tl-sm"
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground px-1 opacity-50">
                                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                </span>

                                                {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                                                    <ActionsList actions={msg.actions} className="mt-2" />
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {isTyping && (
                                        <div className="flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="h-8 w-8 rounded-full bg-card border flex items-center justify-center shrink-0 shadow-sm">
                                                <Bot className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 shadow-sm h-[46px]">
                                                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            <div className="absolute bottom-[69px] left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />

                            {/* Input Area */}
                            <div className="p-3 border-t bg-background/80 backdrop-blur pb-4">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex gap-2 relative"
                                >
                                    <Input
                                        placeholder="Ask about your progress..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        className="h-11 rounded-full pl-5 pr-12 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary/30 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                                        disabled={isInitializing}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className={cn(
                                            "absolute right-1.5 top-1.5 h-8 w-8 rounded-full shadow-sm transition-all duration-300",
                                            input.trim() ? "bg-primary text-primary-foreground scale-100" : "bg-muted text-muted-foreground scale-90 hover:bg-muted"
                                        )}
                                        disabled={isTyping || isInitializing || !sessionId || !input.trim()}
                                    >
                                        {isTyping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 ml-0.5" />}
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </div>
                </div>
            </Card>
        </>
    );
};
