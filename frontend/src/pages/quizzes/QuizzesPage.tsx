import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizzesService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import {
    Plus, Search, Wand2, FileQuestion, Play,
    Loader2, Sparkles, Brain, Trophy
} from 'lucide-react';
import type { QuizResponse } from '@/api/generated';
import { useGenerateQuiz } from '@/api/hooks/useAIGeneration';
import { FloatingPageDock } from '@/components/layout/FloatingPageDock';

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
        <div className="h-full flex flex-col relative">
            <AnimatePresence mode="wait">
                {view === 'HUB' && (
                    <motion.div
                        key="hub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col h-full"
                    >
                        {/* Minimal Title */}
                        <div className="p-6 pb-2">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground/20 select-none">Quizzes</h1>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-24">
                            {/* Loading State */}
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                                    <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
                                        Loading Quizzes...
                                    </p>
                                </div>
                            )}

                            {/* Empty State */}
                            {!isLoading && (!filteredQuizzes || filteredQuizzes.length === 0) && (
                                <div className="flex flex-col items-center justify-center h-full border border-dashed border-border rounded-xl bg-muted/20">
                                    <FileQuestion className="w-16 h-16 text-muted-foreground mb-6" />
                                    <h3 className="text-xl font-bold text-foreground mb-2">
                                        {searchQuery ? 'No Quizzes Found' : 'No Quizzes Active'}
                                    </h3>
                                    <p className="text-muted-foreground font-mono text-xs tracking-wider uppercase mb-6">
                                        {searchQuery ? 'Try a different search term' : 'Create your first quiz to get started'}
                                    </p>
                                    {!searchQuery && (
                                        <button
                                            onClick={() => setView('ARCHITECT')}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-full flex items-center gap-2 font-medium hover:bg-primary/90 transition-colors"
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
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4"
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

                        {/* Floating Control Dock */}
                        <FloatingPageDock className="justify-between">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search quizzes..."
                                    className="w-full h-10 bg-transparent border-none outline-none pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-0"
                                />
                            </div>

                            <div className="h-6 w-px bg-border mx-2" />

                            <button
                                onClick={() => setView('ARCHITECT')}
                                className="h-9 px-4 bg-primary text-primary-foreground rounded-full flex items-center gap-2 text-sm font-medium hover:bg-primary/90 transition-all shadow-md whitespace-nowrap"
                            >
                                <Plus size={16} />
                                New Quiz
                            </button>
                        </FloatingPageDock>

                    </motion.div>
                )}

                {view === 'ARCHITECT' && (
                    <motion.div
                        key="architect"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col h-full bg-background/95 backdrop-blur-xl z-50 absolute inset-0"
                    >
                        <TheArchitect
                            onCancel={() => setView('HUB')}
                            onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
                                view === 'ARCHITECT' && setView('HUB'); // view check to satisfy ts maybe?
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
        if (diff === 'hard' || diff === 'expert') return 'destructive';
        if (diff === 'medium') return 'warning';
        return 'success';
    };

    const color = getDifficultyColor(quiz.difficulty);

    // Dynamic classes based on difficulty
    const borderClass = {
        destructive: 'border-destructive/30 hover:border-destructive',
        warning: 'border-warning/30 hover:border-warning',
        success: 'border-success/30 hover:border-success',
    }[color] || 'border-border hover:border-primary';

    const textClass = {
        destructive: 'text-destructive',
        warning: 'text-warning',
        success: 'text-success',
    }[color] || 'text-primary';

    const bgClass = {
        destructive: 'bg-destructive/10',
        warning: 'bg-warning/10',
        success: 'bg-success/10',
    }[color] || 'bg-primary/10';


    return (
        <motion.div variants={variants} layout>
            <div
                onClick={onStart}
                className={cn(
                    "group relative p-6 h-56 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg rounded-2xl bg-card border",
                    borderClass
                )}
            >
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-2 rounded-lg", bgClass, textClass)}>
                            <Brain size={20} />
                        </div>
                        <div className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border", bgClass, textClass, "border-transparent")}>
                            {quiz.difficulty || 'Standard'}
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {quiz.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {quiz.description || 'No description provided.'}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                            <FileQuestion size={12} />
                            {quiz.question_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                            <Trophy size={12} />
                            {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : '∞'}
                        </span>
                    </div>
                    <div className={cn("p-1.5 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100", bgClass)}>
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
        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full p-10 text-center space-y-6 bg-card border border-border rounded-3xl shadow-2xl">
                <div>
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-6">
                        <Wand2 size={28} className="text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
                        Generate Quiz
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Enter a topic and AI will generate questions for you.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Topic Input - High Contrast Fix */}
                    <input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="e.g. Molecular Biology, History of Rome..."
                        className="w-full text-center text-lg py-3 text-foreground bg-muted/50 border border-input rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-muted-foreground/70"
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
                                            ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/50'
                                            : d === 'medium'
                                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/50'
                                                : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/50'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    {/* Question Count */}
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-muted-foreground text-sm">Questions:</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setNumQuestions(Math.max(5, numQuestions - 5))}
                                disabled={generating || numQuestions <= 5}
                                className="w-8 h-8 rounded bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
                            >
                                -
                            </button>
                            <span className="text-foreground font-medium w-8 text-center">{numQuestions}</span>
                            <button
                                onClick={() => setNumQuestions(Math.min(30, numQuestions + 5))}
                                disabled={generating || numQuestions >= 30}
                                className="w-8 h-8 rounded bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded-full font-medium text-muted-foreground hover:text-foreground transition-colors"
                        disabled={generating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={generating || !topic.trim()}
                        className="h-10 px-8 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
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

