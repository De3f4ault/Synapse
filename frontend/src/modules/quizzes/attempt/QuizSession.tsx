/**
 * QuizSession - Active Quiz Container
 *
 * Main component for an active quiz attempt.
 * Orchestrates question display, navigation, and submission.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    CheckCircle,
    Loader2,
    Award,
    Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuizAttemptState, type LocalQuestionState } from "../core";
import { ProgressBar, QuestionRenderer } from "./components";
import type { QuizAttemptStart } from "@/api/generated";

interface QuizSessionProps {
    state: QuizAttemptState;
    attemptData: QuizAttemptStart;
    currentIndex: number;
    questionStates: Map<number, LocalQuestionState>;
    elapsedTime: number;

    // Actions
    answer: (questionId: number, selectedOption: string, correctAnswer: string) => void;
    goToQuestion: (index: number) => void;
    next: () => void;
    previous: () => void;
    submit: () => void;
    onExit: () => void;
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get current question state or default
 */
function getQuestionState(
    states: Map<number, LocalQuestionState>,
    questionId: number
): LocalQuestionState {
    return (
        states.get(questionId) ?? {
            answered: false,
            selectedAnswer: null,
            isCorrect: null,
            showExplanation: false,
        }
    );
}

export const QuizSession: React.FC<QuizSessionProps> = ({
    state,
    attemptData,
    currentIndex,
    questionStates,
    elapsedTime,
    answer,
    goToQuestion,
    next,
    previous,
    submit,
    onExit,
}) => {
    const [showHint, setShowHint] = useState(false);

    const questions = attemptData.questions;
    const currentQuestion = questions[currentIndex];

    // Safety check for undefined question
    if (!currentQuestion) {
        return null;
    }

    const currentState = getQuestionState(questionStates, currentQuestion.id);
    const isSubmitting = state === QuizAttemptState.SUBMITTING;

    // Stats
    const answeredCount = Array.from(questionStates.values()).filter(
        (s) => s.answered
    ).length;
    const correctCount = Array.from(questionStates.values()).filter(
        (s) => s.isCorrect === true
    ).length;
    const isLastQuestion = currentIndex === questions.length - 1;

    const handleExit = () => {
        if (confirm("Exit quiz? Your progress will be lost.")) {
            onExit();
        }
    };

    const handleSubmit = () => {
        if (answeredCount < questions.length) {
            if (
                !confirm(
                    `You've answered ${answeredCount} of ${questions.length} questions. Submit anyway?`
                )
            ) {
                return;
            }
        }
        submit();
    };

    return (
        <div className="h-screen bg-[#08080c] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-8 bg-[#08080c]/80 backdrop-blur-sm border-b border-white/[0.04] shrink-0 z-20">
                <button
                    onClick={handleExit}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="font-medium">Exit</span>
                </button>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <span className="text-cyan-400 font-mono text-lg font-bold">
                        Q{currentIndex + 1}
                    </span>
                    <span className="text-slate-600 font-mono">/</span>
                    <span className="text-slate-500 font-mono">{questions.length}</span>
                </div>

                <div className="flex items-center gap-6 text-sm font-mono">
                    <div className="flex items-center gap-2 text-slate-400 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.06]">
                        <Clock size={14} className="text-cyan-500" />
                        {formatTime(elapsedTime)}
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <CheckCircle size={14} />
                        {correctCount}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <ProgressBar current={currentIndex} total={questions.length} />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
                <div className="max-w-3xl w-full space-y-8">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <QuestionRenderer
                            question={currentQuestion}
                            questionState={currentState}
                            onAnswer={(selectedOption) => {
                                answer(
                                    currentQuestion.id,
                                    selectedOption,
                                    currentQuestion.correct_answer
                                );
                            }}
                        />
                    </motion.div>

                    {/* Hint Toggle (only if not answered) */}
                    {!currentState.answered && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowHint(!showHint)}
                                className="text-xs font-medium text-slate-500 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
                            >
                                <Lightbulb size={14} />
                                {showHint ? "Hide Hint" : "Show Hint"}
                            </button>
                        </div>
                    )}

                    {/* Hint Content */}
                    {showHint && !currentState.answered && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 text-cyan-200/80 text-sm italic"
                        >
                            Think about the core concept being tested. Eliminate obviously
                            incorrect answers first.
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="h-20 border-t border-white/[0.04] bg-[#0a0a0f]/80 backdrop-blur-md px-8 shrink-0 flex items-center justify-between">
                <button
                    onClick={previous}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors font-medium px-4 py-2"
                >
                    <ArrowLeft size={16} />
                    Previous
                </button>

                {/* Question Dots */}
                <div className="flex gap-1.5 overflow-x-auto max-w-md px-4">
                    {questions.map((q, idx) => {
                        const qState = getQuestionState(questionStates, q.id);
                        return (
                            <button
                                key={idx}
                                onClick={() => goToQuestion(idx)}
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full transition-all",
                                    idx === currentIndex
                                        ? "bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                        : qState.answered
                                            ? qState.isCorrect
                                                ? "bg-emerald-500/50"
                                                : "bg-red-500/50"
                                            : "bg-white/10 hover:bg-white/30"
                                )}
                                title={`Question ${idx + 1}`}
                            />
                        );
                    })}
                </div>

                {isLastQuestion ? (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={cn(
                            "px-8 py-2.5 rounded-lg font-medium flex items-center gap-2",
                            "bg-gradient-to-r from-cyan-600 to-blue-600 text-white",
                            "hover:from-cyan-500 hover:to-blue-500",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "transition-all shadow-lg shadow-cyan-500/20"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Award size={16} />
                                Finish Quiz
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={next}
                        className="px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
                    >
                        Next
                        <ArrowRight size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};
