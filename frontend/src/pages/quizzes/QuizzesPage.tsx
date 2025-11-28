import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { listQuizzesApiV1QuizzesGet, createQuizApiV1QuizzesPost } from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import {
    Plus, Search, FileQuestion, Play, Trophy,
    Cpu, Terminal, Wand2, Loader2, XCircle, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { QuizResponse } from '@/api/generated/types.gen';

// TODO: Implement AI Quiz Generation
// File: src/api/services/gemini.ts
// This should contain the actual Gemini API integration for quiz generation
const mockGenerateQuizSchema = async (topic: string) => {
    await new Promise(r => setTimeout(r, 2000)); // Simulated AI delay
    return {
        title: `Protocol: ${topic.toUpperCase()}`,
        description: `Tactical simulation regarding ${topic}. Constructed by The Architect AI.`,
        time_limit_minutes: 15,
        difficulty: 'Hard'
    };
};

/**
 * Protocol: CRUCIBLE - Command Hub
 *
 * Features:
 * - Military-grade simulation selection interface
 * - The Architect AI quiz generator
 * - High-contrast tactical UI
 * - Real-time search filtering
 * - Color-coded difficulty ratings
 */

export function QuizzesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'HUB' | 'ARCHITECT'>('HUB');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch quizzes
    const { data: quizzes, isLoading } = useQuery({
        queryKey: queryKeys.quizzes.list(),
                                                  queryFn: () => listQuizzesApiV1QuizzesGet(),
    });

    const filteredQuizzes = quizzes?.filter((quiz: QuizResponse) =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
            },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: 'easeOut',
            },
        },
    };

    return (
        <div className="relative w-full min-h-screen bg-[#020408] text-slate-200 font-sans overflow-hidden">
        {/* Ambient Noise Overlay */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

        {/* Radial Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/30 via-[#020408] to-black opacity-70" />

        <div className="relative z-10 p-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
        {view === 'HUB' && (
            <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
            >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div>
            <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-tight">
            Protocol: CRUCIBLE
            </h1>
            <p className="text-slate-500 font-mono text-xs tracking-[0.25em] uppercase">
            Select Simulation Module
            </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH DATABASE..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600 tracking-wider"
            />
            </div>

            {/* New Simulation Button */}
            <button
            onClick={() => setView('ARCHITECT')}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all uppercase tracking-[0.15em] group whitespace-nowrap"
            >
            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300 text-cyan-500" />
            New Simulation
            </button>
            </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                <div className="w-16 h-16 rounded-full border-t-4 border-cyan-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                <Cpu size={24} className="text-cyan-500 animate-pulse" />
                </div>
                </div>
                <p className="mt-6 text-cyan-500 font-mono text-xs tracking-[0.3em] animate-pulse uppercase">
                Loading Simulations...
                </p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!filteredQuizzes || filteredQuizzes.length === 0) && (
                <div className="flex flex-col items-center justify-center py-32 border border-white/5 border-dashed rounded-2xl bg-white/[0.02]">
                <FileQuestion className="w-16 h-16 text-slate-600 mb-6 opacity-50" />
                <h3 className="text-xl font-serif font-bold text-white mb-2">
                {searchQuery ? 'No Simulations Found' : 'No Active Simulations'}
                </h3>
                <p className="text-slate-500 font-mono text-xs tracking-[0.2em] uppercase mb-6">
                {searchQuery ? 'Adjust Search Parameters' : 'Construct Your First Simulation'}
                </p>
                {!searchQuery && (
                    <button
                    onClick={() => setView('ARCHITECT')}
                    className="px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                    <Wand2 className="inline mr-2 h-4 w-4" />
                    Initialize Architect
                    </button>
                )}
                </div>
            )}

            {/* Simulations Grid */}
            {!isLoading && filteredQuizzes && filteredQuizzes.length > 0 && (
                <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10"
                >
                {filteredQuizzes.map((quiz) => (
                    <SimulationCard
                    key={quiz.id}
                    quiz={quiz}
                    variants={cardVariants}
                    onStart={() => navigate(`/quizzes/${quiz.id}/take`)}
                    />
                ))}
                </motion.div>
            )}
            </motion.div>
        )}

        {view === 'ARCHITECT' && (
            <motion.div
            key="architect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            >
            <TheArchitect
            onCancel={() => setView('HUB')}
            onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
                setView('HUB');
            }}
            />
            </motion.div>
        )}
        </AnimatePresence>
        </div>
        </div>
    );
}

/**
 * Simulation Card - Individual Quiz Module
 */
interface SimulationCardProps {
    quiz: QuizResponse;
    variants: any;
    onStart: () => void;
}

function SimulationCard({ quiz, variants, onStart }: SimulationCardProps) {
    // Determine color based on difficulty
    const getDifficultyColor = (difficulty?: string) => {
        const diff = difficulty?.toLowerCase();
        if (diff === 'hard' || diff === 'expert') return 'red';
        if (diff === 'medium') return 'purple';
        return 'cyan';
    };

    const color = getDifficultyColor(quiz.difficulty);

    // Color mapping
    const colorClasses = {
        red: {
            border: 'border-red-500/20 hover:border-red-500/50',
            gradient: 'from-red-900/20',
            badge: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: 'bg-red-500/10 text-red-400 border-red-500/20',
            play: 'bg-red-500 shadow-red-500/50',
        },
        purple: {
            border: 'border-purple-500/20 hover:border-purple-500/50',
            gradient: 'from-purple-900/20',
            badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            icon: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            play: 'bg-purple-500 shadow-purple-500/50',
        },
        cyan: {
            border: 'border-cyan-500/20 hover:border-cyan-500/50',
            gradient: 'from-cyan-900/20',
            badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            icon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            play: 'bg-cyan-500 shadow-cyan-500/50',
        },
    };

    const colors = colorClasses[color];

    return (
        <motion.div variants={variants} layout>
        <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
            "group relative h-64 rounded-2xl bg-[#0A0A0A] border overflow-hidden flex flex-col transition-all cursor-pointer",
            colors.border,
            "hover:shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        )}
        onClick={onStart}
        >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className={cn("absolute inset-0 bg-gradient-to-b via-transparent to-transparent opacity-50", colors.gradient)} />

        {/* Header */}
        <div className="p-6 relative z-10 flex-1">
        <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2.5 rounded-lg border", colors.icon)}>
        <Cpu size={20} />
        </div>
        <div className={cn("px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-wider", colors.badge)}>
        {quiz.difficulty || 'Standard'}
        </div>
        </div>

        <h3 className="text-xl font-bold text-white font-serif mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all line-clamp-2 leading-tight">
        {quiz.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
        {quiz.description || 'No tactical briefing available for this simulation.'}
        </p>
        </div>

        {/* Footer Stats */}
        <div className="mt-auto p-6 border-t border-white/5 flex items-center justify-between relative z-10 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
        <FileQuestion size={12} />
        {quiz.question_count || 0} Qs
        </span>
        <span className="flex items-center gap-1.5">
        <Trophy size={12} />
        {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : '∞'}
        </span>
        </div>
        <motion.div
        className={cn("p-2 rounded-full text-black opacity-0 group-hover:opacity-100 transition-opacity", colors.play)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        >
        <Play size={16} fill="currentColor" />
        </motion.div>
        </div>
        </motion.div>
        </motion.div>
    );
}

/**
 * The Architect - AI Quiz Generator Interface
 */
interface TheArchitectProps {
    onCancel: () => void;
    onSuccess: () => void;
}

function TheArchitect({ onCancel, onSuccess }: TheArchitectProps) {
    const [topic, setTopic] = useState('');
    const [generating, setGenerating] = useState(false);

    // Create quiz mutation
    const createMutation = useMutation({
        mutationFn: createQuizApiV1QuizzesPost,
        onSuccess: () => {
            toast.success('SIMULATION CONSTRUCTED SUCCESSFULLY');
            onSuccess();
        },
        onError: (error) => {
            toast.error('CONSTRUCTION FAILED', {
                description: error instanceof Error ? error.message : 'Neural link failure',
            });
            setGenerating(false);
        },
    });

    const handleCreate = async () => {
        if (!topic.trim()) return;
        setGenerating(true);

        try {
            // TODO: Replace with actual AI generation
            // Should call Gemini API to generate questions
            const schema = await mockGenerateQuizSchema(topic);

            // Create the quiz entry
            createMutation.mutate({
                requestBody: {
                    title: schema.title,
                    description: schema.description,
                    time_limit_minutes: schema.time_limit_minutes,
                    difficulty: schema.difficulty,
                },
            });
        } catch (e) {
            toast.error('NEURAL LINK FAILURE');
            setGenerating(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && topic.trim() && !generating) {
            handleCreate();
        }
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative"
        >
        {/* Radial Gradient Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent opacity-80" />

        <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-12">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 mb-6 shadow-[0_0_40px_rgba(220,38,38,0.3)] relative">
        <Terminal size={32} className="text-red-500" />
        <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
        </div>

        <h1 className="text-5xl font-serif font-bold text-white mb-3 tracking-tight">
        The Architect
        </h1>
        <p className="text-slate-500 font-mono text-xs tracking-[0.25em] uppercase">
        Construct Simulation Parameters
        </p>
        </div>

        {/* Input Field */}
        <div className="relative group mb-8">
        <div className={cn(
            "absolute -inset-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 rounded-xl blur opacity-20 transition-opacity duration-500",
            generating && "opacity-50 animate-pulse"
        )} />
        <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="ENTER SIMULATION TOPIC..."
        className="relative w-full bg-black/50 border border-white/10 rounded-xl p-6 text-lg text-white placeholder:text-slate-700 focus:border-red-500/50 outline-none transition-all text-center font-mono uppercase tracking-[0.15em] focus:shadow-[0_0_30px_rgba(220,38,38,0.2)]"
        disabled={generating}
        autoFocus
        />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
        <button
        onClick={onCancel}
        className="px-6 py-3 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-[0.15em] flex items-center gap-2 hover:bg-white/5 rounded-lg disabled:opacity-50"
        disabled={generating}
        >
        <XCircle size={14} />
        Abort
        </button>
        <button
        onClick={handleCreate}
        disabled={generating || !topic.trim()}
        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-[0.15em] transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 flex items-center gap-2 hover:scale-105 active:scale-95"
        >
        {generating ? (
            <>
            <Loader2 size={14} className="animate-spin" />
            Compiling...
            </>
        ) : (
            <>
            <Wand2 size={14} />
            Initialize
            </>
        )}
        </button>
        </div>

        {/* Generation Status */}
        <AnimatePresence>
        {generating && (
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-8 text-center font-mono text-[10px] text-red-500/60 space-y-1"
            >
            <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            >
            &gt; PARSING SEMANTIC VECTORS...
            </motion.p>
            <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
            >
            &gt; GENERATING OPPOSING FORCES...
            </motion.p>
            <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
            >
            &gt; FINALIZING PARAMETERS...
            </motion.p>
            </motion.div>
        )}
        </AnimatePresence>
        </div>
        </motion.div>
    );
}
