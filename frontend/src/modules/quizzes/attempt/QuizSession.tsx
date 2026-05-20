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
import { QuestionRenderer } from "./components";
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
        <div className="h-screen flex flex-col overflow-hidden bg-background">
            {/* Floating Exit Button - Top Left */}
            <button
                onClick={handleExit}
                className="fixed top-6 left-6 flex items-center gap-2 px-3 py-2 rounded-full bg-foreground/5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-20 opacity-60 hover:opacity-100"
            >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Exit</span>
            </button>

            {/* Floating Progress - Top Center */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 opacity-60 hover:opacity-100 transition-opacity">
                <span className="text-primary font-mono text-lg font-bold">
                    Q{currentIndex + 1}
                </span>
                <span className="text-muted-foreground font-mono">/</span>
                <span className="text-muted-foreground font-mono">{questions.length}</span>
            </div>

            {/* Floating Stats - Top Right */}
            <div className="fixed top-6 right-6 flex flex-col items-end gap-2 z-20 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full text-sm font-mono">
                        <Clock size={14} className="text-primary" />
                        {formatTime(elapsedTime)}
                    </div>
                    <div className="flex items-center gap-2 text-accent-olive bg-accent-olive/10 px-3 py-1.5 rounded-full text-sm font-mono">
                        <CheckCircle size={14} />
                        {correctCount}
                    </div>
                </div>
                {/* Mini Progress Bar */}
                <div className="w-32 h-1 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Main Content - Centered with more vertical space */}
            <div className="flex-1 overflow-y-auto px-6 py-8 pt-20 flex justify-center">
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
                                className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
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
                            className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-primary/80/80 text-sm italic"
                        >
                            Think about the core concept being tested. Eliminate obviously
                            incorrect answers first.
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Floating Previous Button - Bottom Left */}
            <button
                onClick={previous}
                disabled={currentIndex === 0}
                className="fixed bottom-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground/5 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:bg-muted/50 transition-colors z-20 opacity-60 hover:opacity-100"
            >
                <ArrowLeft size={16} />
                <span className="text-sm font-medium">Previous</span>
            </button>

            {/* Floating Question Dots - Bottom Center */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 opacity-60 hover:opacity-100 transition-opacity">
                {questions.map((q, idx) => {
                    const qState = getQuestionState(questionStates, q.id);
                    return (
                        <button
                            key={idx}
                            onClick={() => goToQuestion(idx)}
                            className={cn(
                                "w-2.5 h-2.5 rounded-full transition-all",
                                idx === currentIndex
                                    ? "bg-primary scale-125 shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                                    : qState.answered
                                        ? qState.isCorrect
                                            ? "bg-accent-olive/50"
                                            : "bg-destructive/50"
                                        : "bg-foreground/10 hover:bg-muted"
                            )}
                            title={`Question ${idx + 1}`}
                        />
                    );
                })}
            </div>

            {/* Floating Next/Finish Button - Bottom Right */}
            {isLastQuestion ? (
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                        "fixed bottom-6 right-6 px-6 py-2.5 rounded-full font-medium flex items-center gap-2 z-20",
                        "bg-primary text-primary-foreground",
                        "hover:bg-primary/90",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all shadow-lg "
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Submitting...</span>
                        </>
                    ) : (
                        <>
                            <Award size={16} />
                            <span className="text-sm">Finish</span>
                        </>
                    )}
                </button>
            ) : (
                <button
                    onClick={next}
                    className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-2.5 rounded-full bg-foreground/5 hover:bg-muted text-foreground transition-colors z-20 opacity-60 hover:opacity-100"
                >
                    <span className="text-sm font-medium">Next</span>
                    <ArrowRight size={16} />
                </button>
            )}
        </div>
    );
};
