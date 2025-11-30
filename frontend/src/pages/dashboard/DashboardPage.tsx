import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Bot, Send } from 'lucide-react';
import './styles/dashboard.css';
import './styles/graph.css';
import './styles/animations.css';
import { DashboardHeader } from './components/header/DashboardHeader';
import { DashboardContainer } from './components/main-area/DashboardContainer';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardSync } from './hooks/useDashboardSync';
import { LoadingState } from './components/shared/LoadingState';

/**
 * DashboardPage - Synapse Viewport (Production Version)
 *
 * CLEANED:
 * - Removed all duplicate bottom controls
 * - Single footer navigation via DashboardHeader
 * - Streamlined AI window
 * - Clean, immersive layout
 */
export function DashboardPage() {
    const { data, isLoading, error } = useDashboardData();
    useDashboardSync();

    const [isAIOpen, setIsAIOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-[#020202] flex items-center justify-center">
            <LoadingState />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-screen bg-[#020202] flex items-center justify-center text-red-500 font-mono">
            SYSTEM ERROR: CONNECTION FAILED
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-[#020202] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30 flex flex-col relative">

        {/* 1. Cinematic Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />
        <div className="absolute top-0 left-0 w-[50vw] h-[50vh] bg-purple-900/10 blur-[150px] rounded-full opacity-50" />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-cyan-900/10 blur-[150px] rounded-full opacity-50" />
        </div>

        {/* 2. Main Workspace - Clean 3-column layout */}
        <div className="flex-1 relative z-10 overflow-hidden">
        <DashboardContainer data={data} />
        </div>

        {/* 3. Footer Command Deck - SINGLE navigation control */}
        <DashboardHeader />

        {/* 4. AI Assistant Trigger Button */}
        <motion.button
        onClick={() => setIsAIOpen(!isAIOpen)}
        className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-[#0F0F0F]/90 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform group"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        >
        <Sparkles className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
        </motion.button>

        {/* 5. Mini AI Window Overlay */}
        <MiniAIWindow isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

        </div>
    );
}

// --- Mini AI Window Component ---
function MiniAIWindow({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [typedText, setTypedText] = useState('');
    const fullText = "Systems nominal. I've analyzed your current session data. Your velocity in Bio-Chemistry is up 12%. Would you like to schedule a deep review?";

    useEffect(() => {
        if (isOpen) {
            let i = 0;
            setTypedText('');
            const interval = setInterval(() => {
                setTypedText(fullText.slice(0, i + 1));
                i++;
                if (i > fullText.length) clearInterval(interval);
            }, 30);
                return () => clearInterval(interval);
        }
    }, [isOpen, fullText]);

    return (
        <AnimatePresence>
        {isOpen && (
            <>
            {/* Invisible Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            {/* The Window */}
            <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-8 w-80 h-96 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white tracking-wide">Cortex Assistant</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
            </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
            <Bot className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="flex-1 bg-white/5 p-3 rounded-xl rounded-tl-none text-xs text-slate-300 border border-white/5 leading-relaxed">
            {typedText}
            </div>
            </div>
            <div className="flex gap-3 flex-row-reverse">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
            <span className="text-[9px] font-bold text-purple-400">CM</span>
            </div>
            <div className="flex-1 bg-purple-500/10 p-3 rounded-xl rounded-tr-none text-xs text-purple-100 border border-purple-500/20 leading-relaxed text-right">
            Show me the breakdown for the Kreb Cycle module.
            </div>
            </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-black/40">
            <div className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-white/10 focus-within:border-cyan-500/30 transition-colors">
            <input type="text" placeholder="Ask Cortex..." className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-slate-600 font-medium ml-1" />
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400 transition-colors">
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
