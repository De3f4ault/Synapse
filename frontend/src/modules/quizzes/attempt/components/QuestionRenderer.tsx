/**
 * QuestionRenderer - Single Question Display
 *
 * Renders a quiz question with options and feedback.
 * Dark themed with subtle animations.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionResponse } from "@/api/generated";
import type { LocalQuestionState } from "../../core";

interface QuestionRendererProps {
    question: QuestionResponse;
    questionState: LocalQuestionState;
    onAnswer: (selectedOption: string) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
    question,
    questionState,
    onAnswer,
}) => {
    const options =
        typeof question.options === "object" && question.options !== null
            ? Object.entries(question.options as Record<string, string>)
            : [];

    const correctAnswer = question.correct_answer || "";
    const explanation = question.explanation || "";

    return (
        <div className="space-y-6">
            {/* Question Card */}
            <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-medium text-foreground leading-relaxed mb-8">
                    {question.question_text}
                </h2>

                {/* Options */}
                <div className="space-y-3">
                    {options.map(([key, value]) => {
                        const optionLetter = key;
                        const optionText = typeof value === "string" ? value : String(value);
                        const isSelected = questionState.selectedAnswer === optionLetter;
                        const isAnswered = questionState.answered;
                        const isThisCorrect =
                            optionLetter.toLowerCase() === correctAnswer.toLowerCase();

                        let statusClass =
                            "border-border bg-muted text-foreground/80 hover:border-primary/30 hover:bg-primary/5";
                        let indicator = (
                            <span className="font-mono text-sm opacity-50">{optionLetter}.</span>
                        );

                        if (isAnswered) {
                            if (isThisCorrect) {
                                statusClass =
                                    "border-emerald-500/50 bg-accent-olive/10 text-accent-olive shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                                indicator = <CheckCircle size={18} className="text-accent-olive" />;
                            } else if (isSelected) {
                                statusClass = "border-destructive/50 bg-destructive/10 text-destructive";
                                indicator = <XCircle size={18} className="text-destructive" />;
                            } else {
                                statusClass =
                                    "border-border bg-muted text-muted-foreground opacity-50";
                            }
                        }

                        return (
                            <button
                                key={key}
                                onClick={() => {
                                    if (!isAnswered) {
                                        onAnswer(optionLetter);
                                    }
                                }}
                                disabled={isAnswered}
                                className={cn(
                                    "w-full p-5 rounded-xl border text-left transition-all duration-200 flex items-start gap-4 group",
                                    statusClass
                                )}
                            >
                                <div className="mt-0.5 shrink-0 w-6 flex justify-center">
                                    {indicator}
                                </div>
                                <span className="flex-1 text-base leading-relaxed">{optionText}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                    {questionState.answered && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className={cn(
                                "overflow-hidden rounded-xl border p-5",
                                questionState.isCorrect
                                    ? "bg-accent-olive/5 border-accent-olive/20"
                                    : "bg-muted border-border"
                            )}
                        >
                            <div className="flex gap-3">
                                <div className="shrink-0 mt-1">
                                    {questionState.isCorrect ? (
                                        <div className="p-1.5 rounded-full bg-accent-olive/20 text-accent-olive">
                                            <CheckCircle size={16} />
                                        </div>
                                    ) : (
                                        <div className="p-1.5 rounded-full bg-white/[0.06] text-muted-foreground">
                                            <Lightbulb size={16} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4
                                        className={cn(
                                            "font-bold mb-1 text-sm uppercase tracking-wider",
                                            questionState.isCorrect ? "text-accent-olive" : "text-foreground/80"
                                        )}
                                    >
                                        {questionState.isCorrect ? "Correct!" : "Insight"}
                                    </h4>
                                    <p className="text-muted-foreground leading-relaxed text-sm">
                                        {explanation || "No additional explanation provided."}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
