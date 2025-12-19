import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizzesService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import {
    Plus, Search, Wand2, FileQuestion, Loader2, Sparkles, X, Brain
} from 'lucide-react';
import type { QuizResponse } from '@/api/generated';
import { useGenerateQuiz } from '@/api/hooks/useAIGeneration';
import { NeumorphicButton, NeumorphicCard } from '@/components/neumorphic';
import { QuizCard } from './components/list/QuizCard';

/**
 * QuizzesPage - Neumorphic Redesign
 */
export function QuizzesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'HUB' | 'ARCHITECT'>('HUB');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch quizzes
    const { data: quizzes, isLoading } = useQuery({
        queryKey: queryKeys.quizzes.list(),
        queryFn: () => QuizzesService.listQuizzesApiV1QuizzesGet(),
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
        <div className="relative min-h-screen nm-bg nm-constellation-bg overflow-hidden flex flex-col">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            <AnimatePresence mode="wait">
                {view === 'HUB' && (
                    <motion.div
                        key="hub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col h-full"
                    >
                        {/* Top Bar: Search */}
                        <div className="flex-none pt-8 pb-4 px-8 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent z-30">
                            <div className="max-w-xl mx-auto">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search simulations..."
                                        className="w-full h-12 bg-[#0f0f16] border border-white/10 rounded-full pl-12 pr-12 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide p-8 pt-0 pb-32">
                            {/* Loading State */}
                            {isLoading && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="h-64 rounded-[2rem] bg-white/5 border border-white/5 animate-pulse" />
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {!isLoading && (!filteredQuizzes || filteredQuizzes.length === 0) && (
                                <div className="h-[60vh] flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 rounded-2xl nm-inset flex items-center justify-center text-slate-600 mb-6 border border-white/5">
                                        <FileQuestion size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {searchQuery ? 'No simulations found' : 'No active simulations'}
                                    </h3>
                                    <p className="text-slate-400 mb-8 max-w-xs text-center font-mono text-sm">
                                        {searchQuery ? 'Adjust your parameters' : 'Initialize your first training scenario.'}
                                    </p>
                                    {!searchQuery && (
                                        <NeumorphicButton
                                            onClick={() => setView('ARCHITECT')}
                                            variant="primary"
                                        >
                                            <Wand2 size={16} className="mr-2" />
                                            Initialize Architect
                                        </NeumorphicButton>
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
                                        <QuizCard
                                            key={quiz.id}
                                            quiz={quiz}
                                            variants={cardVariants}
                                            onStart={() => navigate(`/quizzes/${quiz.id}/take`)}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* FAB: The Architect */}
                        <div className="fixed bottom-8 right-8 z-40">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(6,182,212,0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setView('ARCHITECT')}
                                className="h-14 px-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 flex items-center gap-2 font-bold tracking-wide text-base transition-all"
                            >
                                <Wand2 size={20} strokeWidth={2.5} />
                                New Quiz
                            </motion.button>
                        </div>

                    </motion.div>
                )}

                {view === 'ARCHITECT' && (
                    <motion.div
                        key="architect"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
                        onClick={(e) => e.target === e.currentTarget && setView('HUB')}
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
 * The Architect - Quiz Generator Modal (Refactored)
 */
interface TheArchitectProps {
    onCancel: () => void;
    onSuccess: () => void;
}

function TheArchitect({ onCancel, onSuccess }: TheArchitectProps) {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [numQuestions, setNumQuestions] = useState(10);

    // Use real AI generation hook
    const generateQuiz = useGenerateQuiz();
    const generating = generateQuiz.isPending;

    const handleCreate = async () => {
        if (!topic.trim()) return;

        generateQuiz.mutate(
            {
                topic: topic.trim(),
                num_questions: numQuestions,
                difficulty: difficulty
            },
            {
                onSuccess: () => {
                    onSuccess();
                }
            }
        );
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
        <NeumorphicCard className="max-w-lg w-full p-10 text-center space-y-6 relative border-purple-500/20">
            {/* Close Button */}
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
                <X size={20} />
            </button>

            <div>
                <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 mb-6 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <Brain size={28} className="text-purple-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    The Architect
                </h2>
                <p className="text-slate-400 text-sm">
                    Initialize a new training simulation via AI generation.
                </p>
            </div>

            <div className="space-y-4">
                {/* Topic Input */}
                <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="e.g. Molecular Biology, History of Rome..."
                    className="w-full text-center text-lg py-3 text-white bg-slate-900/50 border border-slate-700 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors placeholder:text-slate-600"
                    disabled={generating}
                    autoFocus
                />

                {/* Difficulty Selection */}
                <div className="flex gap-2 justify-center">
                    {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            disabled={generating}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                difficulty === d
                                    ? d === 'easy'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                        : d === 'medium'
                                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                            )}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                {/* Question Count */}
                <div className="flex items-center justify-center gap-4">
                    <span className="text-slate-400 text-sm font-mono uppercase tracking-wider">Params:</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setNumQuestions(Math.max(5, numQuestions - 5))}
                            disabled={generating || numQuestions <= 5}
                            className="w-8 h-8 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                            -
                        </button>
                        <span className="text-white font-medium w-8 text-center">{numQuestions}</span>
                        <button
                            onClick={() => setNumQuestions(Math.min(30, numQuestions + 5))}
                            disabled={generating || numQuestions >= 30}
                            className="w-8 h-8 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 justify-center pt-4">
                <NeumorphicButton
                    onClick={onCancel}
                    variant="ghost"
                    disabled={generating}
                >
                    Cancel
                </NeumorphicButton>
                <NeumorphicButton
                    onClick={handleCreate}
                    disabled={generating || !topic.trim()}
                    variant="primary"
                    className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                    {generating ? (
                        <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Constructing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} className="mr-2" />
                            Generate
                        </>
                    )}
                </NeumorphicButton>
            </div>
        </NeumorphicCard>
    );
}
