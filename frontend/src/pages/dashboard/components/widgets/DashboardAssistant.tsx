import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatService } from '@/api/generated';

interface DashboardAssistantProps {
    className?: string;
}

// Local message type to handle both optimistic and server messages
interface UIMessage {
    id: string | number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

const STORAGE_KEY = 'synapse_dashboard_session_id';

export const DashboardAssistant: React.FC<DashboardAssistantProps> = ({ className }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [messages, setMessages] = useState<UIMessage[]>([
        {
            role: 'assistant',
            content: "Hello! I'm monitoring your learning progress. Ask me about your weak areas or what to study next.",
            id: 'init',
            timestamp: new Date().toISOString(),
        }
    ]);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            const storedId = localStorage.getItem(STORAGE_KEY);
            if (storedId) {
                setSessionId(parseInt(storedId));
            } else {
                setIsInitializing(true);
                try {
                    const session = await ChatService.createSessionApiV1ChatSessionsPost({
                        title: 'Dashboard Assistant',
                    });
                    if (session.id) {
                        setSessionId(session.id);
                        localStorage.setItem(STORAGE_KEY, session.id.toString());
                    }
                } catch (e) {
                    console.error("Failed to create dashboard session", e);
                } finally {
                    setIsInitializing(false);
                }
            }
        };
        initSession();
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId) return;

        const userMsg: UIMessage = {
            role: 'user',
            content: input,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await ChatService.sendMessageApiV1ChatSessionsSessionIdMessagesPost(
                sessionId,
                { content: input }
            );

            if (response && response.content) {
                const botMsg: UIMessage = {
                    role: response.role as 'user' | 'assistant',
                    content: response.content,
                    id: response.id,
                    timestamp: response.created_at
                };
                setMessages(prev => [...prev, botMsg]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting to the neural network right now.",
                id: 'error',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

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
        <Card className={cn(
            "fixed bottom-6 right-6 w-[380px] shadow-2xl border-primary/20 z-50 flex flex-col transition-all duration-300 ease-in-out",
            "h-[600px] flex flex-col overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", // Increased height
            className
        )}>
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-4 px-4 flex flex-row items-center justify-between space-y-0 border-b">
                <div className="flex items-center gap-3">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors rounded-full" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>

            {/* Chat Area */}
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                <ScrollArea className="flex-1 p-4 pr-5 h-full w-full">
                    <div className="space-y-6 pb-2">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full gap-3",
                                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                {/* Avatar */}
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

                                {/* Message Bubble (Card Style) */}
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
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex w-full gap-3">
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

                {/* Visual Fade at Bottom of Scroll */}
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
        </Card>
    );
};
