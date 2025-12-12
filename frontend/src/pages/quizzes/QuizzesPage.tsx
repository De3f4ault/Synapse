import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { listQuizzesApiV1QuizzesGet, createQuizApiV1QuizzesPost } from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import {
    Plus, Search, Wand2, FileQuestion, Play,
    Loader2, Sparkles, Brain, Trophy
} from 'lucide-react';
import { toast } from 'sonner';
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
        queryFn: async () => {
            const response = await listQuizzesApiV1QuizzesGet();
            return (response as any).data ?? response;
        },
    });

    // Ensure quizzes is an array before filtering
    const quizzesArray = Array.isArray(quizzes) ? quizzes : [];
    const filteredQuizzes = quizzesArray.filter((quiz: QuizResponse) =>
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
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: 'easeOut',
            },
        },
    };

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col p-6 space-y-6">
            <AnimatePresence mode="wait">
                {view === 'HUB' && (
                    <motion.div
                        key="hub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col h-full space-y-6"
                    >
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                    Quizzes
                                </h1>
                                <p className="text-slate-400 font-mono text-xs tracking-wider uppercase">
                                    Test your knowledge
                                </p>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                {/* Search Bar */}
                                <div className="relative flex-1 md:w-72">
                                    <div className="synapse-search-box">
                                        <Search className="w-4 h-4 text-slate-500" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search quizzes..."
                                            className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
                                        />
                                    </div>
                                </div>

                                {/* New Quiz Button */}
                                <button
                                    onClick={() => setView('ARCHITECT')}
                                    className="synapse-button-primary synapse-button flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                                    New Quiz
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            {/* Loading State */}
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                                    <p className="text-slate-400 font-mono text-sm uppercase tracking-wider">
                                        Loading Quizzes...
                                    </p>
                                </div>
                            )}

                            {/* Empty State */}
                            {!isLoading && (!filteredQuizzes || filteredQuizzes.length === 0) && (
                                <div className="flex flex-col items-center justify-center h-full border border-white/5 border-dashed rounded-xl bg-white/[0.02]">
                                    <FileQuestion className="w-16 h-16 text-slate-700 mb-6" />
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {searchQuery ? 'No Quizzes Found' : 'No Quizzes Active'}
                                    </h3>
                                    <p className="text-slate-500 font-mono text-xs tracking-wider uppercase mb-6">
                                        {searchQuery ? 'Try a different search term' : 'Create your first quiz to get started'}
                                    </p>
                                    {!searchQuery && (
                                        <button
                                            onClick={() => setView('ARCHITECT')}
                                            className="synapse-button flex items-center gap-2"
                                        >
                                            <Wand2 size={14} />
                                            Create Quiz
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Quizzes Grid */}
                            {!isLoading && filteredQuizzes && filteredQuizzes.length > 0 && (
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
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
                        </div>
                    </motion.div>
                )}

                {view === 'ARCHITECT' && (
                    <motion.div
                        key="architect"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col h-full bg-[#020408]"
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
    );
}

/**
 * Quiz Card Component
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

    const colors = {
        red: 'border-red-500/30 hover:border-red-500',
        purple: 'border-purple-500/30 hover:border-purple-500',
        cyan: 'border-cyan-500/30 hover:border-cyan-500',
    }[color];

    return (
        <motion.div variants={variants} layout>
            <div
                onClick={onStart}
                className={`synapse-panel group relative p-6 h-56 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg ${colors}`}
            >
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg bg-white/5 text-${color}-400`}>
                            <Brain size={20} />
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                            {quiz.difficulty || 'Standard'}
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                        {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                        {quiz.description || 'No description provided.'}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                            <FileQuestion size={12} />
                            {quiz.question_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                            <Trophy size={12} />
                            {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : '∞'}
                        </span>
                    </div>
                    <div className={`p-1.5 rounded-full bg-${color}-500 text-black opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100`}>
                        <Play size={14} fill="currentColor" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Create Quiz Interface
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
        mutationFn: async (data: any) => {
            const response = await createQuizApiV1QuizzesPost({ body: data });
            return (response as any).data ?? response;
        },
        onSuccess: () => {
            toast.success('Quiz Generated Successfully');
            onSuccess();
        },
        onError: (error) => {
            toast.error('Generation Failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            setGenerating(false);
        },
    });

    const handleCreate = async () => {
        if (!topic.trim()) return;
        setGenerating(true);

        try {
            // Simulated AI Generation step
            const schema = await mockGenerateQuizSchema(topic);

            // Create the quiz entry
            createMutation.mutate({
                title: schema.title,
                description: schema.description,
                time_limit_minutes: schema.time_limit_minutes,
                difficulty: schema.difficulty as any, // Cast to any to avoid strict enum check for now
            });
        } catch (error) {
            toast.error('Generation Failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/50">
            <div className="synapse-panel max-w-lg w-full p-10 text-center space-y-8">
                <div>
                    <div className="w-16 h-16 mx-auto bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20 mb-6">
                        <Wand2 size={28} className="text-cyan-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        Generate Quiz
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Enter a topic and AI will generate questions for you.
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="e.g. Molecular Biology, History of Rome..."
                        className="synapse-input w-full text-center text-lg py-3"
                        disabled={generating}
                        autoFocus
                    />
                </div>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onCancel}
                        className="synapse-button text-slate-400 hover:text-white"
                        disabled={generating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={generating || !topic.trim()}
                        className="synapse-button-primary synapse-button px-8 flex items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                Generate
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
