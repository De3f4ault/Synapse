import React, { useState, useRef, useEffect } from 'react';
import { NeumorphicCard, NeumorphicButton } from '@/components/neumorphic';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, Minimize2, Zap, Target, Lightbulb, Loader2, ChevronLeft, ChevronRight, Plus, Trash2, MessageSquare, X } from 'lucide-react';
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
                // Check if click is on the trigger button (handled separately)
                // setIsOpen(false); 
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

                // Generate title if this is first user message (excluding welcome)
                const userMessagesCount = messages.filter(m => m.role === 'user').length;
                if (userMessagesCount === 1 && sessionId) {
                    // This is the first user message
                    const title = await generateSessionTitle(userMsg.content);
                    await updateSessionTitle(sessionId, title);
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

    // Generate title using AI
    const generateSessionTitle = async (firstMessage: string): Promise<string> => {
        try {
            const response = await fetch('/api/v1/chat/sessions/dashboard/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: `Generate a concise 3-5 word title for this question: "${firstMessage}"

Rules:
- Be specific and descriptive
- Remove filler words (help me, can you, etc.)
- Focus on the main topic
- Use title case

Examples:
"Create 10 flashcards on Linux CFS" → "Linux CFS Flashcards"
"What are my weak areas?" → "Weak Areas Review"
"Explain how photosynthesis works" → "Photosynthesis Explanation"

Title:`
                })
            });

            if (response.ok) {
                const data = await response.json();
                let title = data.content?.trim().replace(/^["']|["']$/g, ''); // Remove quotes

                // Fallback if response is too long or empty
                if (!title || title.length > 60) {
                    const words = firstMessage.split(' ').slice(0, 5);
                    title = words.join(' ') + (firstMessage.split(' ').length > 5 ? '...' : '');
                }

                return title;
            }
        } catch (error) {
            console.error('Failed to generate title:', error);
        }

        // Fallback: use first 5 words
        const words = firstMessage.split(' ').slice(0, 5);
        return words.join(' ') + (firstMessage.split(' ').length > 5 ? '...' : '');
    };

    // Update session title via API
    const updateSessionTitle = async (sessionId: number, title: string) => {
        try {
            await fetch(`/api/v1/chat/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title })
            });

            // Update in local sessions list
            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, title } : s
            ));
        } catch (error) {
            console.error('Failed to update session title:', error);
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
            <NeumorphicButton
                variant="primary"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in p-0 flex items-center justify-center"
                onClick={() => setIsMinimized(false)}
            >
                <Bot className="h-6 w-6" />
            </NeumorphicButton>
        );
    }

    // Closed state
    if (!isOpen) {
        return (
            <NeumorphicButton
                variant="primary"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in p-0 flex items-center justify-center"
                onClick={() => setIsOpen(true)}
            >
                <Bot className="h-6 w-6" />
            </NeumorphicButton>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 animate-in fade-in duration-200" onClick={() => setIsOpen(false)} />

            <NeumorphicCard
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 ease-in-out p-0 border-0 overflow-hidden",
                    "h-[680px] bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10",
                    "animate-in slide-in-from-bottom-4 fade-in duration-300",
                    showSidebar ? "w-[600px]" : "w-[420px]",
                    className
                )}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500/10 via-cyan-500/5 to-transparent py-4 px-4 flex flex-row items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <NeumorphicButton
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={toggleSidebar}
                        >
                            {showSidebar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </NeumorphicButton>
                        <div className="w-8 h-8 rounded-lg nm-inset flex items-center justify-center text-cyan-400">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">Synapse Assistant</h3>
                            <div className="flex items-center gap-1.5">
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    isInitializing ? "bg-amber-400 animate-pulse" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                )} />
                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                                    {isInitializing ? 'INITIALIZING...' : 'ONLINE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <NeumorphicButton
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-white"
                        onClick={() => setIsOpen(false)}
                    >
                        <Minimize2 className="h-4 w-4" />
                    </NeumorphicButton>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className={cn(
                        "border-r border-white/5 bg-[#050508]/50 transition-all duration-300 overflow-hidden flex flex-col",
                        showSidebar ? "w-[180px]" : "w-0"
                    )}>
                        {/* New Chat Button */}
                        <div className="p-3 border-b border-white/5">
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
                                {sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className={cn(
                                            "group relative p-2 rounded-lg cursor-pointer transition-all text-xs border border-transparent",
                                            "hover:bg-white/5",
                                            session.id === sessionId ? "bg-white/5 border-white/10 shadow-inner" : ""
                                        )}
                                        onClick={() => switchSession(session.id)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-slate-500" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-slate-200">
                                                    {session.title}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                    {formatSessionDate(session.updated_at)}
                                                </div>
                                            </div>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                                                onClick={(e) => deleteSession(session.id, e)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0f]/50">
                        {/* Quick Actions Bar */}
                        <div className="px-3 py-3 border-b border-white/5 flex gap-2 overflow-x-auto scrollbar-hide">
                            {[
                                { icon: Zap, label: "Flashcards", prompt: "Create flashcards for my weak areas" },
                                { icon: Target, label: "Weak Areas", prompt: "What are my weak areas?" },
                                { icon: Lightbulb, label: "Tips", prompt: "Suggest topics to study next" }
                            ].map((action, i) => (
                                <NeumorphicButton
                                    key={i}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-3 shrink-0 whitespace-nowrap"
                                    onClick={() => handleQuickAction(action.prompt)}
                                    disabled={isTyping || isInitializing}
                                >
                                    <action.icon className="h-3 w-3 mr-1.5 text-cyan-400" />
                                    {action.label}
                                </NeumorphicButton>
                            ))}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 flex flex-col p-0 overflow-hidden relative">
                            <ScrollArea className="flex-1 p-4 pr-5 h-full w-full">
                                <div className="space-y-6 pb-20">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg nm-inset flex items-center justify-center shrink-0",
                                                msg.role === 'user' ? "text-slate-400" : "text-cyan-400"
                                            )}>
                                                {msg.role === 'user' ? (
                                                    <div className="h-2 w-2 rounded-full bg-slate-500" />
                                                ) : (
                                                    <Bot className="h-4 w-4" />
                                                )}
                                            </div>

                                            <div className={cn(
                                                "flex flex-col gap-1 max-w-[85%]",
                                                msg.role === 'user' ? "items-end" : "items-start"
                                            )}>
                                                <div className={cn(
                                                    "rounded-2xl px-4 py-3 text-sm shadow-sm",
                                                    msg.role === 'user'
                                                        ? "bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20 text-slate-100 rounded-tr-sm"
                                                        : "bg-white/[0.03] border border-white/[0.05] text-slate-300 rounded-tl-sm"
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-slate-600 font-mono px-1">
                                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                </span>

                                                {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                                                    <ActionsList actions={msg.actions} className="mt-2 w-full" />
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {isTyping && (
                                        <div className="flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="h-8 w-8 rounded-lg nm-inset flex items-center justify-center shrink-0 text-cyan-400">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 h-[46px]">
                                                <span className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce"></span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            {/* Gradient Fade */}
                            <div className="absolute bottom-[72px] left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />

                            {/* Input Area */}
                            <div className="p-4 bg-[#0a0a0f] border-t border-white/5 relative z-10">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex gap-2 relative"
                                >
                                    <Input
                                        placeholder="Ask about your progress..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        className="h-11 rounded-xl pl-4 pr-12 bg-white/5 border-white/5 text-white placeholder:text-slate-600 focus-visible:bg-white/10 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/30 transition-all font-light"
                                        disabled={isInitializing}
                                    />
                                    <NeumorphicButton
                                        type="submit"
                                        size="icon"
                                        className={cn(
                                            "absolute right-1.5 top-1.5 h-8 w-8 rounded-lg transition-all duration-300",
                                            input.trim() ? "text-cyan-400 hover:text-cyan-300" : "text-slate-600"
                                        )}
                                        variant="ghost"
                                        disabled={isTyping || isInitializing || !sessionId || !input.trim()}
                                    >
                                        {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </NeumorphicButton>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </NeumorphicCard>
        </>
    );
};
