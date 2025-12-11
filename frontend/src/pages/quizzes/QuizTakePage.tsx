import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import {
    startQuizAttemptApiV1QuizzesQuizIdStartPost,
    submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import type { QuizAttemptStart, AnswerSubmit } from '@/api/generated/types.gen';
import {
    Brain, Zap, CheckCircle, XCircle, Trophy,
    XCircle as XIcon, Loader2, HelpCircle, Bot,
    AlertTriangle, Target, Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// TODO: Implement AI Proctor with Gemini API
// File: src/api/services/gemini.ts
// Should provide contextual hints without revealing answers
const mockGetHint = async (question: string, options: string[]) => {
    await new Promise(r => setTimeout(r, 1500));
    const keyword = question.split(' ').find(w => w.length > 6) || 'concept';
    return `TACTICAL HINT: Consider the core function of ${keyword}. Analyze each option's relationship to the primary objective. Eliminate obvious outliers first.`;
};

/**
 * Protocol: CRUCIBLE - Active Simulation
 *
 * Features:
 * - High-stakes testing environment
 * - Real-time answer feedback with visual states
 * - AI Proctor sidebar with tactical hints
 * - Streak tracking and momentum system
 * - Military-grade HUD with progress indicators
 * - Immersive completion ceremony with rank calculation
 */

export function QuizTakePage() {
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const id = parseInt(quizId || '0', 10);

    // Core State
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Map<number, string>>(new Map());
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [attemptData, setAttemptData] = useState<QuizAttemptStart | null>(null);

    // UI State
    const [gameState, setGameState] = useState<'LOADING' | 'ACTIVE' | 'REVIEW' | 'END'>('LOADING');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [aiHint, setAiHint] = useState<string | null>(null);
    const [loadingHint, setLoadingHint] = useState(false);
    const [startTime] = useState(Date.now());

    // Session timer
    const [elapsedTime, setElapsedTime] = useState(0);
    useEffect(() => {
        if (gameState === 'ACTIVE' || gameState === 'REVIEW') {
            const interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState, startTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- MUTATIONS ---
    const { mutate: startAttempt } = useMutation({
        mutationFn: () => startQuizAttemptApiV1QuizzesQuizIdStartPost({ quizId: id }),
        onSuccess: (data) => {
            setAttemptData(data);
            setGameState('ACTIVE');
        },
        onError: (error) => {
            toast.error('CONNECTION SEVERED: UNABLE TO START SIMULATION', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            navigate('/quizzes');
        },
    });

    const { mutate: submitQuiz, data: results } = useMutation({
        mutationFn: () => {
            if (!attemptData) throw new Error('No attempt data');
            const answersArray: AnswerSubmit[] = Array.from(answers.entries()).map(([qId, ans]) => ({
                question_id: qId,
                answer: ans,
            }));
            return submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost({
                attemptId: attemptData.attempt_id,
                requestBody: answersArray,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
            setGameState('END');
        },
        onError: (error) => {
            toast.error('UPLOAD FAILED: DATA PACKET LOST', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // --- EFFECTS ---
    useEffect(() => {
        if (id && !attemptData) startAttempt();
    }, [id]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (gameState === 'END' || gameState === 'LOADING') return;

            // ESC to abort
            if (e.key === 'Escape') {
                if (confirm('Abort simulation? Progress will be lost.')) {
                    navigate('/quizzes');
                }
            }

            // Enter to proceed when in review
            if (e.key === 'Enter' && gameState === 'REVIEW') {
                nextQuestion();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [gameState]);

    // --- HANDLERS ---
    const handleAnswer = (option: string) => {
        if (selectedOption !== null || !attemptData?.questions) return;

        setSelectedOption(option);
        const currentQ = attemptData.questions[currentIdx];

        // Store answer
        setAnswers(prev => new Map(prev).set(currentQ.id, option));

        // Update streak (optimistic - we don't know if it's correct yet)
        // In a real system with correct_answer field, we'd check here
        const newStreak = streak + 1;
        setStreak(newStreak);
        setMaxStreak(Math.max(maxStreak, newStreak));

        // Move to review state
        setTimeout(() => setGameState('REVIEW'), 600);
    };

    const nextQuestion = () => {
        if (!attemptData?.questions) return;

        // Reset UI state
        setAiHint(null);
        setSelectedOption(null);

        if (currentIdx < attemptData.questions.length - 1) {
            setCurrentIdx(p => p + 1);
            setGameState('ACTIVE');
        } else {
            // Last question - submit
            submitQuiz();
        }
    };

    const getHint = async () => {
        if (!attemptData?.questions) return;
        setLoadingHint(true);

        try {
            const q = attemptData.questions[currentIdx];
            const options = typeof q.options === 'object' && q.options !== null
                ? Object.values(q.options).map(String)
                : [];

            // TODO: Replace with actual Gemini API call
            const hint = await mockGetHint(q.question_text, options);
            setAiHint(hint);
        } catch {
            setAiHint('LINK OFFLINE - NEURAL ASSISTANCE UNAVAILABLE');
        }

        setLoadingHint(false);
    };

    // --- RENDER STATES ---

    // Loading State
    if (gameState === 'LOADING' || !attemptData?.questions) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                <p className="text-slate-400 font-mono text-sm uppercase tracking-wider">
                    Initializing Quiz...
                </p>
            </div>
        );
    }

    // End State - Results Summary
    if (gameState === 'END' && results) {
        const score = typeof results.score === 'string' ? parseFloat(results.score) : results.score || 0;
        const percentage = results.percentage || 0;

        // Calculate rank
        const getRank = (pct: number) => {
            if (pct >= 95) return { grade: 'S', color: 'text-yellow-400' };
            if (pct >= 85) return { grade: 'A', color: 'text-emerald-400' };
            if (pct >= 75) return { grade: 'B', color: 'text-cyan-400' };
            if (pct >= 60) return { grade: 'C', color: 'text-purple-400' };
            return { grade: 'D', color: 'text-red-400' };
        };

        const rank = getRank(percentage);

        return (
            <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col items-center justify-center p-8">
                <Confetti recycle={false} numberOfPieces={500} />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="synapse-panel max-w-lg w-full p-8 text-center"
                >
                    <Trophy size={64} className="mx-auto text-yellow-400 mb-6" />

                    <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete</h2>
                    <p className="text-slate-400 text-sm mb-8">
                        Performance Report
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Accuracy</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-2xl font-bold text-cyan-400">{score.toFixed(0)}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Score</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className={cn("text-2xl font-bold", rank.color)}>{rank.grade}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Rank</div>
                        </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Max Streak</div>
                            <div className="text-xl font-bold text-purple-400 flex items-center gap-2">
                                <Zap size={16} fill="currentColor" />
                                {maxStreak}
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Duration</div>
                            <div className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                                <Target size={16} />
                                {formatTime(elapsedTime)}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/quizzes')}
                        className="synapse-button w-full justify-center"
                    >
                        Return to Quizzes
                    </button>
                </motion.div>
            </div>
        );
    }

    // Active Simulation State
    const currentQ = attemptData.questions[currentIdx];
    const options = typeof currentQ.options === 'object' && currentQ.options !== null
        ? Object.values(currentQ.options).map(String)
        : [];

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col relative font-sans">
            {/* Top HUD */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm z-20">
                <button
                    onClick={() => {
                        if (confirm('Abort quiz? Progress will be lost.')) {
                            navigate('/quizzes');
                        }
                    }}
                    className="text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                    <XIcon size={16} />
                    Exit
                </button>

                {/* Progress Tracker */}
                <div className="flex flex-col items-center">
                    <div className="flex gap-1.5">
                        {attemptData.questions.map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-8 h-1 rounded-full transition-all duration-300",
                                    i < currentIdx ? 'bg-cyan-500' :
                                        i === currentIdx ? 'bg-white' :
                                            'bg-white/10'
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-slate-400">
                        {formatTime(elapsedTime)}
                    </div>
                    <div className="text-xs font-mono text-purple-400 flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                        <Zap size={14} fill="currentColor" />
                        Streak: {streak}
                    </div>
                </div>
            </div>

            {/* Main Arena */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Question Panel */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <motion.div
                            key={currentIdx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="synapse-panel p-8"
                        >
                            {/* Question Text */}
                            <h2 className="text-2xl font-bold text-white leading-relaxed mb-8">
                                {currentQ.question_text}
                            </h2>

                            {/* Options */}
                            <div className="space-y-3">
                                {options.map((opt, i) => {
                                    const optStr = String(opt);
                                    const isSelected = selectedOption === optStr;

                                    let statusClass = 'border-white/10 hover:border-cyan-500/50 hover:bg-white/5 text-slate-300';
                                    if (selectedOption !== null) {
                                        if (isSelected) statusClass = 'border-cyan-500 bg-cyan-500/10 text-cyan-400';
                                        else statusClass = 'border-white/5 text-slate-600 opacity-50';
                                    }

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleAnswer(optStr)}
                                            disabled={selectedOption !== null}
                                            className={cn(
                                                "w-full p-4 rounded-lg border text-left transition-all duration-200 relative overflow-hidden group",
                                                statusClass
                                            )}
                                        >
                                            <div className="flex items-center justify-between relative z-10">
                                                <span className="text-sm font-medium">{optStr}</span>
                                                {isSelected && <CheckCircle size={18} className="text-cyan-400" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Review State Action */}
                        <AnimatePresence>
                            {gameState === 'REVIEW' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="synapse-panel p-4 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                                            Answer recorded.
                                        </div>
                                    </div>
                                    <button
                                        onClick={nextQuestion}
                                        className="synapse-button"
                                    >
                                        Next Question
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* AI Proctor Sidebar */}
                    <div className="lg:col-span-4">
                        <div className="h-full synapse-panel p-6 flex flex-col min-h-[300px]">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                <Bot size={20} className="text-cyan-400" />
                                <div>
                                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                                        AI Assistant
                                    </div>
                                </div>
                            </div>

                            {/* Hint Display */}
                            <div className="flex-1 overflow-y-auto mb-4 text-sm text-slate-400 leading-relaxed custom-scrollbar">
                                {aiHint ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-purple-500/10 border border-purple-500/20 p-4 rounded text-purple-200 text-xs"
                                    >
                                        <span className="font-bold block mb-2 text-purple-400 font-mono tracking-wider uppercase text-[10px]">
                                            Hint:
                                        </span>
                                        {aiHint}
                                    </motion.div>
                                ) : (
                                    <div className="text-center opacity-30 mt-10 text-xs font-mono space-y-1">
                                        <p>NO ACTIVE HINTS</p>
                                    </div>
                                )}
                            </div>

                            {/* Request Button */}
                            <button
                                onClick={getHint}
                                disabled={loadingHint || selectedOption !== null}
                                className={cn(
                                    "synapse-button w-full",
                                    selectedOption !== null && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {loadingHint ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin mr-2" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <HelpCircle size={14} className="mr-2" />
                                        Get Hint
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
