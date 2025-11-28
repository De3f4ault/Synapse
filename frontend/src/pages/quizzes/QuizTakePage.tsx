import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
                <div className="h-screen flex flex-col items-center justify-center bg-[#020408]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                <div className="relative">
                <div className="w-24 h-24 rounded-full border-t-4 border-cyan-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                <Cpu size={32} className="text-cyan-500 animate-pulse" />
                </div>
                </div>
                <div className="mt-6 text-cyan-500 font-mono text-sm tracking-[0.3em] animate-pulse uppercase">
                Initializing Crucible...
                </div>
                </div>
            );
        }

        // End State - Results Summary
        if (gameState === 'END' && results) {
            const score = typeof results.score === 'string' ? parseFloat(results.score) : results.score || 0;
            const percentage = results.percentage || 0;

            // Calculate rank
            const getRank = (pct: number) => {
                if (pct >= 95) return { grade: 'S', color: 'text-yellow-400', glow: 'shadow-yellow-500/50' };
                if (pct >= 85) return { grade: 'A', color: 'text-emerald-400', glow: 'shadow-emerald-500/50' };
                if (pct >= 75) return { grade: 'B', color: 'text-cyan-400', glow: 'shadow-cyan-500/50' };
                if (pct >= 60) return { grade: 'C', color: 'text-purple-400', glow: 'shadow-purple-500/50' };
                return { grade: 'D', color: 'text-red-400', glow: 'shadow-red-500/50' };
            };

            const rank = getRank(percentage);

            return (
                <div className="h-screen flex flex-col items-center justify-center p-8 bg-[#020408] relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black" />

                <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-lg w-full bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 text-center relative overflow-hidden z-10"
                >
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50" />

                <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                >
                <Trophy size={64} className="mx-auto text-emerald-400 mb-6 drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]" />
                </motion.div>

                <h2 className="text-3xl font-serif font-bold text-white mb-2">Simulation Complete</h2>
                <p className="text-slate-400 font-mono text-xs mb-8 tracking-[0.2em] uppercase">
                Performance Report Generated
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent" />
                <div className="text-2xl font-bold text-white relative z-10">{percentage.toFixed(0)}%</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 font-mono">Accuracy</div>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
                <div className="text-2xl font-bold text-cyan-400 relative z-10">{score.toFixed(0)}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 font-mono">Points</div>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
                <div className={cn("text-2xl font-bold relative z-10", rank.color)}>{rank.grade}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 font-mono">Rank</div>
                </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Max Streak</div>
                <div className="text-xl font-bold text-purple-400 flex items-center gap-2">
                <Zap size={16} fill="currentColor" />
                {maxStreak}
                </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Duration</div>
                <div className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                <Target size={16} />
                {formatTime(elapsedTime)}
                </div>
                </div>
                </div>

                <button
                onClick={() => navigate('/quizzes')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all uppercase tracking-[0.15em] text-xs shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95"
                >
                Return to Hub
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
            <div className="h-screen flex flex-col bg-[#050505] relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/30 via-black to-black" />

            {/* Top HUD */}
            <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md z-20 relative">
            <button
            onClick={() => {
                if (confirm('Abort simulation? Progress will be lost.')) {
                    navigate('/quizzes');
                }
            }}
            className="text-slate-500 hover:text-red-400 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors"
            >
            <XIcon size={16} />
            Abort
            </button>

            {/* Progress Tracker */}
            <div className="flex flex-col items-center">
            <div className="text-[10px] font-mono text-cyan-500 mb-1 tracking-[0.2em]">
            SIMULATION PROGRESS
            </div>
            <div className="flex gap-1">
            {attemptData.questions.map((_, i) => (
                <div
                key={i}
                className={cn(
                    "w-8 h-1 rounded-full transition-all duration-300",
                    i < currentIdx ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' :
                    i === currentIdx ? 'bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]' :
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
            <div className="text-xs font-mono text-purple-400 flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded">
            <Zap size={14} fill="currentColor" />
            STREAK: {streak}
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#0A0A0A]/90 border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden"
            >
            {/* Accent Bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-500" />

            {/* Question ID */}
            <span className="text-cyan-500 font-mono text-xs mb-4 block tracking-[0.2em] uppercase">
            QUERY_ID: {currentQ.id.toString().padStart(4, '0')}
            </span>

            {/* Question Text */}
            <h2 className="text-2xl font-serif text-white leading-relaxed mb-8">
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
                    "w-full p-4 rounded-lg border text-left transition-all duration-300 relative overflow-hidden group",
                    statusClass
                )}
                >
                <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-medium">{optStr}</span>
                {isSelected && <CheckCircle size={18} className="text-cyan-400" />}
                </div>
                {/* Hover Scanline Effect */}
                {selectedOption === null && (
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                )}
                </button>
            );
            })}
            </div>
            </motion.div>

            {/* Review State Action */}
            <AnimatePresence>
            {gameState === 'REVIEW' && (
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#0A0A0A] border border-l-4 border-l-purple-500 border-white/10 p-6 rounded-xl flex items-center justify-between"
                >
                <div>
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase mb-1 font-mono tracking-wider">
                <AlertTriangle size={14} />
                Status
                </div>
                <p className="text-sm text-slate-300">
                Answer recorded. Proceed to next objective.
                </p>
                </div>
                <button
                onClick={nextQuestion}
                className="px-6 py-2 bg-white text-black text-xs font-bold rounded hover:bg-cyan-400 transition-all uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
                >
                Next Objective
                </button>
                </motion.div>
            )}
            </AnimatePresence>
            </div>

            {/* AI Proctor Sidebar */}
            <div className="lg:col-span-4">
            <div className="h-full bg-black/20 border border-white/10 rounded-xl p-6 backdrop-blur-md flex flex-col min-h-[300px]">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Bot size={20} />
            </div>
            <div>
            <div className="text-xs font-bold text-white uppercase tracking-[0.15em]">
            The Proctor
            </div>
            <div className="text-[9px] font-mono text-purple-400/60">
            AI ASSISTANT ONLINE
            </div>
            </div>
            </div>

            {/* Hint Display */}
            <div className="flex-1 overflow-y-auto mb-4 text-sm text-slate-400 leading-relaxed custom-scrollbar">
            {aiHint ? (
                <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-purple-900/10 border border-purple-500/20 p-4 rounded text-purple-200 text-xs"
                >
                <span className="font-bold block mb-2 text-purple-400 font-mono tracking-wider uppercase text-[10px]">
                &gt;&gt; Incoming Intel:
                </span>
                {aiHint}
                </motion.div>
            ) : (
                <div className="text-center opacity-30 mt-10 text-xs font-mono space-y-1">
                <p>// SYSTEM MONITORING...</p>
                <p>// AWAITING REQUEST...</p>
                </div>
            )}
            </div>

            {/* Request Button */}
            <button
            onClick={getHint}
            disabled={loadingHint || selectedOption !== null}
            className={cn(
                "w-full py-3 border rounded text-xs font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2",
                selectedOption !== null
                ? 'opacity-50 cursor-not-allowed border-white/5 text-slate-500'
                : 'border-purple-500/30 hover:bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]'
            )}
            >
            {loadingHint ? (
                <>
                <Loader2 size={14} className="animate-spin" />
                Analyzing...
                </>
            ) : (
                <>
                <HelpCircle size={14} />
                Request Intel
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
