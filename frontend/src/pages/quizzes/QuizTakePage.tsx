import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizzesService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { QuizResultsView } from './components/results/QuizResultsView';
import type { QuizAttemptStart, AnswerSubmit, AnswerResult } from '@/api/generated';
import {
    CheckCircle, XCircle, Loader2, Lightbulb,
    ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * QuizTakePage - Enhanced Quiz Experience with Real-Time Feedback
 * 
 * Features:
 * - Real-time feedback on each answer (correct/incorrect shown immediately)
 * - Explanation shown after answering
 * - Previous/Next navigation
 * - Collapsible hints
 * - Detailed results summary
 */

interface QuestionState {
    answered: boolean;
    selectedAnswer: string | null;
    isCorrect: boolean | null;
    showExplanation: boolean;
}

export function QuizTakePage() {
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const id = parseInt(quizId || '0', 10);

    // Core State
    const [currentIdx, setCurrentIdx] = useState(0);
    const [questionStates, setQuestionStates] = useState<Map<number, QuestionState>>(new Map());
    const [attemptData, setAttemptData] = useState<QuizAttemptStart | null>(null);

    // UI State
    const [gameState, setGameState] = useState<'LOADING' | 'ACTIVE' | 'RESULTS'>('LOADING');
    const [showHint, setShowHint] = useState(false);
    const [startTime] = useState(Date.now());
    const [elapsedTime, setElapsedTime] = useState(0);

    // Timer
    useEffect(() => {
        if (gameState === 'ACTIVE') {
            const interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
        return undefined;
    }, [gameState, startTime]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Start Quiz
    const { mutate: startAttempt } = useMutation({
        mutationFn: async () => {
            return QuizzesService.startQuizAttemptApiV1QuizzesQuizIdStartPost(Number(id));
        },
        onSuccess: (data) => {
            setAttemptData(data);
            setGameState('ACTIVE');
        },
        onError: (error) => {
            toast.error('Failed to start quiz', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            navigate('/quizzes');
        },
    });

    // Submit Quiz
    const { mutate: submitQuiz, data: results, isPending: isSubmitting } = useMutation({
        mutationFn: async () => {
            if (!attemptData) throw new Error('No attempt data');
            const answersArray: AnswerSubmit[] = [];

            questionStates.forEach((state, qId) => {
                if (state.selectedAnswer) {
                    answersArray.push({
                        question_id: qId,
                        answer: state.selectedAnswer,
                    });
                }
            });

            return QuizzesService.submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost(
                attemptData.attempt_id,
                answersArray
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
            setGameState('RESULTS');
        },
        onError: (error) => {
            toast.error('Failed to submit quiz', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    useEffect(() => {
        if (id && !attemptData) startAttempt();
    }, [id]);

    // Get current question state
    const getCurrentState = useCallback((questionId: number): QuestionState => {
        return questionStates.get(questionId) || {
            answered: false,
            selectedAnswer: null,
            isCorrect: null,
            showExplanation: false
        };
    }, [questionStates]);

    // Handle answer selection with real-time feedback
    const handleAnswer = (questionId: number, answer: string, correctAnswer: string) => {
        const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

        setQuestionStates(prev => {
            const newMap = new Map(prev);
            newMap.set(questionId, {
                answered: true,
                selectedAnswer: answer,
                isCorrect,
                showExplanation: true // Auto-show explanation on answer
            });
            return newMap;
        });
    };

    // Navigation
    const goToQuestion = (idx: number) => {
        if (attemptData?.questions && idx >= 0 && idx < attemptData.questions.length) {
            setCurrentIdx(idx);
            setShowHint(false);
        }
    };

    const handleFinish = () => {
        // Check if all questions answered
        const answeredCount = Array.from(questionStates.values()).filter(s => s.answered).length;
        const totalQuestions = attemptData?.questions.length || 0;

        if (answeredCount < totalQuestions) {
            if (!confirm(`You've only answered ${answeredCount} of ${totalQuestions} questions. Submit anyway?`)) {
                return;
            }
        }
        submitQuiz();
    };

    // Calculate stats
    const getStats = () => {
        const answered = Array.from(questionStates.values());
        const correct = answered.filter(s => s.isCorrect === true).length;
        const total = attemptData?.questions.length || 0;

        return {
            answered: answered.filter(s => s.answered).length,
            correct,
            total,
            percentage: total > 0 ? Math.round((correct / total) * 100) : 0
        };
    };

    // Loading State
    if (gameState === 'LOADING' || !attemptData?.questions) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                <p className="text-slate-400 text-sm">Loading Quiz...</p>
            </div>
        );
    }

    // Results State
    if (gameState === 'RESULTS' && results) {
        const stats = getStats();
        const percentage = results.percentage || 0;

        const getRank = (pct: number) => {
            if (pct >= 90) return { grade: 'A+', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
            if (pct >= 80) return { grade: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
            if (pct >= 70) return { grade: 'B', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
            if (pct >= 60) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
            return { grade: 'D', color: 'text-red-400', bg: 'bg-red-500/10' };
        };
        const rank = getRank(percentage);

        const performanceProp = {
            score: percentage, // percentage is used as score in display
            percentage: percentage,
            rank: rank,
            maxStreak: 0, // Not tracked yet, defaulting
            duration: elapsedTime,
            correctCount: stats.correct,
            totalCount: stats.total
        };

        return (
            <QuizResultsView
                performance={performanceProp}
                attemptData={attemptData!}
                results={results}
                onReturn={() => navigate('/quizzes')}
            />
        );
    }

    // Active Quiz State - Get current question safely
    const questions = attemptData.questions;
    const currentQ = questions[currentIdx];

    if (!currentQ) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <p className="text-slate-400">Question not found</p>
            </div>
        );
    }

    const currentState = getCurrentState(currentQ.id);
    const options = typeof currentQ.options === 'object' && currentQ.options !== null
        ? Object.entries(currentQ.options as Record<string, string>)
        : [];
    const stats = getStats();

    // Get correct answer from question (now available from backend)
    const correctAnswer = (currentQ as any).correct_answer || '';
    const explanation = (currentQ as any).explanation || '';

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
                <button
                    onClick={() => {
                        if (confirm('Exit quiz? Your progress will be submitted.')) {
                            handleFinish();
                        }
                    }}
                    className="text-slate-400 hover:text-white text-sm flex items-center gap-2"
                >
                    <ArrowLeft size={16} />
                    Exit
                </button>

                <div className="text-sm text-slate-400">
                    <span className="text-white font-medium">{currentIdx + 1}</span> / {questions.length}
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                        <Clock size={14} />
                        {formatTime(elapsedTime)}
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={14} />
                        {stats.correct}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-800">
                <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                    <motion.div
                        key={currentIdx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        {/* Question */}
                        <div className="synapse-panel p-6">
                            <h2 className="text-xl font-medium text-white leading-relaxed mb-6">
                                {currentQ.question_text}
                            </h2>

                            {/* Options */}
                            <div className="space-y-3">
                                {options.map(([key, value]) => {
                                    const optionLetter = key;
                                    const optionText = typeof value === 'string' ? value : String(value);
                                    const isSelected = currentState.selectedAnswer === optionLetter;
                                    const isAnswered = currentState.answered;
                                    const isThisCorrect = optionLetter.toLowerCase() === correctAnswer.toLowerCase();

                                    let statusClass = 'border-slate-700 hover:border-cyan-500/50 text-slate-300';

                                    if (isAnswered) {
                                        if (isThisCorrect) {
                                            // This is the correct answer - always show green
                                            statusClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
                                        } else if (isSelected) {
                                            // User selected this wrong answer
                                            statusClass = 'border-red-500 bg-red-500/10 text-red-400';
                                        } else {
                                            // Other options
                                            statusClass = 'border-slate-800 text-slate-600';
                                        }
                                    }

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                if (!isAnswered) {
                                                    handleAnswer(currentQ.id, optionLetter, correctAnswer);
                                                }
                                            }}
                                            disabled={isAnswered}
                                            className={cn(
                                                "w-full p-4 rounded-lg border text-left transition-all",
                                                statusClass,
                                                !isAnswered && "hover:bg-white/5 cursor-pointer"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="font-mono text-sm opacity-60">{optionLetter}.</span>
                                                <span className="flex-1">{optionText}</span>
                                                {isAnswered && isThisCorrect && (
                                                    <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                                                )}
                                                {isAnswered && isSelected && !isThisCorrect && (
                                                    <XCircle size={18} className="text-red-400 flex-shrink-0" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Real-time Feedback after answering */}
                            <AnimatePresence>
                                {currentState.answered && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={cn(
                                            "mt-4 p-4 rounded-lg border",
                                            currentState.isCorrect
                                                ? "bg-emerald-500/10 border-emerald-500/30"
                                                : "bg-red-500/10 border-red-500/30"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            {currentState.isCorrect ? (
                                                <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />
                                            ) : (
                                                <XCircle className="text-red-400 flex-shrink-0" size={20} />
                                            )}
                                            <div>
                                                <p className={cn(
                                                    "font-medium mb-1",
                                                    currentState.isCorrect ? "text-emerald-400" : "text-red-400"
                                                )}>
                                                    {currentState.isCorrect ? "That's right!" : "Not quite"}
                                                </p>
                                                {explanation && (
                                                    <p className="text-slate-400 text-sm">
                                                        {explanation}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Hint Section */}
                        {!currentState.answered && (
                            <div className="synapse-panel overflow-hidden">
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    className="w-full p-4 flex items-center justify-between text-left"
                                >
                                    <span className="flex items-center gap-2 text-slate-400">
                                        <Lightbulb size={16} />
                                        Need a hint?
                                    </span>
                                    {showHint ? (
                                        <ChevronUp size={16} className="text-slate-400" />
                                    ) : (
                                        <ChevronDown size={16} className="text-slate-400" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {showHint && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="px-4 pb-4"
                                        >
                                            <p className="text-slate-500 text-sm">
                                                Think about the core concept being tested. Eliminate obviously incorrect answers first.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="h-16 border-t border-white/5 flex items-center justify-between px-6 bg-black/20">
                <button
                    onClick={() => goToQuestion(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    className="synapse-button disabled:opacity-50 flex items-center gap-2"
                >
                    <ArrowLeft size={14} />
                    Previous
                </button>

                <div className="flex gap-2">
                    {questions.map((q, idx) => {
                        const state = getCurrentState(q.id);
                        return (
                            <button
                                key={idx}
                                onClick={() => goToQuestion(idx)}
                                className={cn(
                                    "w-8 h-8 rounded-full text-xs font-medium transition-all",
                                    idx === currentIdx
                                        ? "bg-cyan-500 text-white"
                                        : state.answered
                                            ? state.isCorrect
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                                : "bg-red-500/20 text-red-400 border border-red-500/50"
                                            : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                                )}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>

                {currentIdx === questions.length - 1 ? (
                    <button
                        onClick={handleFinish}
                        disabled={isSubmitting}
                        className="synapse-button-primary px-6 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Finish Quiz'
                        )}
                    </button>
                ) : (
                    <button
                        onClick={() => goToQuestion(currentIdx + 1)}
                        className="synapse-button-primary px-6 flex items-center gap-2"
                    >
                        Next
                        <ArrowRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
