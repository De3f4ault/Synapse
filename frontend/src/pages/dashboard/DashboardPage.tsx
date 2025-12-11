import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Bot, Send, BarChart3, Target, GitBranch, Activity, Maximize2 } from 'lucide-react';
// Local styles removed - using global synapse-theme.css

// Components
import { LoadingState } from './components/shared/LoadingState';
import { WelcomeCard } from './components/hero/WelcomeCard';
import { QuickStats } from './components/hero/QuickStats';
import { NextAction } from './components/hero/NextAction';
import { MetricsGrid } from './components/overview/MetricsGrid';
import { StreakCard } from './components/overview/StreakCard';
import { PerformanceChart } from './components/analytics/PerformanceChart';
import { StudyHeatmap } from './components/analytics/StudyHeatmap';
import { MasteryOverview } from './components/analytics/MasteryOverview';
import { LearningPath } from './components/pathways/LearningPath';
import { ActivityFeed } from './components/activity/ActivityFeed';
import { IntelligencePanel } from './components/main-area/IntelligencePanel';
import { FocusQueue } from './components/main-area/FocusQueue';

// Hooks
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardSync } from './hooks/useDashboardSync';
import { useIntelligence } from './hooks/useIntelligence';

type DashboardView = 'analytics' | 'focus' | 'pathways' | 'activity';

export function DashboardPage() {
    const { data, isLoading, error } = useDashboardData();
    useDashboardSync();
    const { nextAction } = useIntelligence(data);

    const [activeView, setActiveView] = useState<DashboardView>('analytics');
    const [isAIOpen, setIsAIOpen] = useState(false);

    if (isLoading) return <div className="h-full flex items-center justify-center"><LoadingState /></div>;
    if (error) return <div className="h-full flex items-center justify-center text-red-500 font-mono">SYSTEM ERROR</div>;

    return (
        <div className="h-full flex flex-col overflow-hidden">

            {/* Background */}
            {/* Background handled by AppShell */}

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 pb-32">
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* Hero */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2"><WelcomeCard overview={data?.overview || null} /></div>
                        <NextAction recommendation={nextAction} />
                    </div>

                    <QuickStats overview={data?.overview || null} />

                    {/* Views */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeView === 'analytics' && (
                                <div className="space-y-6">
                                    <MetricsGrid overview={data?.overview || null} />
                                    <div className="grid lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2"><PerformanceChart data={data?.performance || []} /></div>
                                        <StreakCard streakDays={data?.overview?.study_streak_days || 0} longestStreak={data?.overview?.study_streak_days || 0} />
                                    </div>
                                    <StudyHeatmap data={data?.heatmap || []} />
                                    <MasteryOverview data={data} />
                                </div>
                            )}
                            {activeView === 'focus' && (
                                <div className="grid lg:grid-cols-2 gap-6">
                                    <IntelligencePanel data={data} />
                                    <FocusQueue data={data} />
                                </div>
                            )}
                            {activeView === 'pathways' && <LearningPath data={data} />}
                            {activeView === 'activity' && <ActivityFeed />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Nav */}
            <Footer activeView={activeView} onViewChange={setActiveView} />

            {/* AI Button */}
            <button
                onClick={() => setIsAIOpen(!isAIOpen)}
                className="fixed bottom-32 right-8 z-50 w-14 h-14 rounded-full bg-[#0F0F0F]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:scale-110 transition-transform"
            >
                <Sparkles className="w-6 h-6 text-slate-400 hover:text-cyan-400" />
            </button>

            {/* AI Chat */}
            <AIChat isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
        </div>
    );
}

function Footer({ activeView, onViewChange }: { activeView: DashboardView; onViewChange: (v: DashboardView) => void }) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const nav = [
        { id: 'analytics' as const, icon: BarChart3, color: 'cyan' },
        { id: 'focus' as const, icon: Target, color: 'purple' },
        { id: 'pathways' as const, icon: GitBranch, color: 'emerald' },
        { id: 'activity' as const, icon: Activity, color: 'orange' },
    ];

    const colors = {
        cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
            <div className="bg-[#0F0F0F]/90 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 flex gap-2">
                {nav.map(({ id, icon: Icon, color }) => (
                    <button
                        key={id}
                        onClick={() => onViewChange(id)}
                        className={`p-3 rounded-full transition-all border ${activeView === id ? `${colors[color]} scale-110` : 'border-transparent hover:bg-white/5 text-slate-500'
                            }`}
                    >
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                ))}
            </div>

            <button
                onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}
                className="w-12 h-12 rounded-full bg-[#0F0F0F]/90 backdrop-blur-xl border border-white/10 hover:border-white/20 flex items-center justify-center relative"
            >
                <Maximize2 className={`w-5 h-5 text-slate-500 transition-all ${isFullscreen ? 'rotate-180' : ''}`} />
                {isFullscreen && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />}
            </button>
        </div>
    );
}

function AIChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; thinking?: string }>>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Import chat hooks
    const { mutate: createSession } = useCreateSession();
    const { sendMessage, isStreaming, streamingContent, streamingThinking, isConnected } = useChatStreaming({
        sessionId: sessionId || undefined,
        autoConnect: isOpen,
    });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamingContent, isStreaming]);

    // Create session when opened
    useEffect(() => {
        if (isOpen && !sessionId) {
            createSession(
                { title: 'Dashboard Quick Chat' },
                {
                    onSuccess: (session) => {
                        setSessionId(session.id);
                    },
                }
            );
        }
    }, [isOpen, sessionId, createSession]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId || !isConnected) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to local state
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            await sendMessage(userMessage);
        } catch (error) {
            console.error('Failed to send:', error);
        }
    };

    // When streaming completes, add to messages
    useEffect(() => {
        if (!isStreaming && streamingContent && sessionId) {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: streamingContent, thinking: streamingThinking }
            ]);
        }
    }, [isStreaming, streamingContent, streamingThinking, sessionId]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-32 right-8 w-96 h-[500px] bg-[#0c1214]/95 backdrop-blur-xl border border-white/10 rounded-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm font-semibold">Synapse AI</span>
                                {!isConnected && (
                                    <span className="text-[10px] text-amber-400 font-mono">CONNECTING...</span>
                                )}
                            </div>
                            <button onClick={onClose}>
                                <X className="w-4 h-4 text-slate-500 hover:text-white" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                            {!sessionId ? (
                                <div className="text-center text-xs text-slate-500 animate-pulse">
                                    Initializing session...
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, i) => (
                                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                                    <Bot className="w-3 h-3 text-cyan-400" />
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] p-3 rounded-xl text-xs ${msg.role === 'user'
                                                    ? 'bg-slate-800 text-slate-200 rounded-br-none'
                                                    : 'bg-white/5 text-slate-300 border border-white/5 rounded-bl-none'
                                                }`}>
                                                {msg.thinking && (
                                                    <div className="text-[10px] text-cyan-400 font-mono mb-2 opacity-60">
                                                        [THINKING...]
                                                    </div>
                                                )}
                                                <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Streaming message */}
                                    {isStreaming && (
                                        <div className="flex gap-3">
                                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                                <Bot className="w-3 h-3 text-cyan-400 animate-pulse" />
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl text-xs text-slate-300 border border-white/5 rounded-bl-none max-w-[75%]">
                                                {streamingThinking && (
                                                    <div className="text-[10px] text-cyan-400 font-mono mb-2 opacity-60 animate-pulse">
                                                        [THINKING...]
                                                    </div>
                                                )}
                                                <div className="leading-relaxed whitespace-pre-wrap">
                                                    {streamingContent || (
                                                        <span className="text-slate-500 font-mono animate-pulse">...</span>
                                                    )}
                                                    <motion.span
                                                        className="inline-block w-0.5 h-3 bg-cyan-400 ml-0.5"
                                                        animate={{ opacity: [1, 0, 1] }}
                                                        transition={{ duration: 0.8, repeat: Infinity }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/5">
                            <div className="bg-[#0c1214] rounded-full border border-white/10 flex items-center px-3 py-2 focus-within:border-cyan-500/30">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder="Ask about your learning..."
                                    disabled={!isConnected || !sessionId}
                                    className="flex-1 bg-transparent text-xs outline-none text-slate-300 placeholder:text-slate-600 disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || !isConnected || !sessionId}
                                    className="text-slate-500 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Import required hooks at top
import { useCreateSession } from '@/pages/chat/hooks/useChatSession';
import { useChatStreaming } from '@/pages/chat/hooks/useChatStreaming';
import { useRef } from 'react';
