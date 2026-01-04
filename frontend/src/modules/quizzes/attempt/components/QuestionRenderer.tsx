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
            <div className="bg-[#0c0c12] border border-white/[0.06] rounded-2xl p-8">
                <h2 className="text-2xl font-medium text-slate-100 leading-relaxed mb-8">
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
                            "border-white/[0.06] bg-[#08080c] text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5";
                        let indicator = (
                            <span className="font-mono text-sm opacity-50">{optionLetter}.</span>
                        );

                        if (isAnswered) {
                            if (isThisCorrect) {
                                statusClass =
                                    "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                                indicator = <CheckCircle size={18} className="text-emerald-400" />;
                            } else if (isSelected) {
                                statusClass = "border-red-500/50 bg-red-500/10 text-red-400";
                                indicator = <XCircle size={18} className="text-red-400" />;
                            } else {
                                statusClass =
                                    "border-white/[0.04] bg-[#08080c] text-slate-500 opacity-50";
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
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-[#08080c] border-white/[0.08]"
                            )}
                        >
                            <div className="flex gap-3">
                                <div className="shrink-0 mt-1">
                                    {questionState.isCorrect ? (
                                        <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                            <CheckCircle size={16} />
                                        </div>
                                    ) : (
                                        <div className="p-1.5 rounded-full bg-white/[0.06] text-slate-400">
                                            <Lightbulb size={16} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4
                                        className={cn(
                                            "font-bold mb-1 text-sm uppercase tracking-wider",
                                            questionState.isCorrect ? "text-emerald-400" : "text-slate-300"
                                        )}
                                    >
                                        {questionState.isCorrect ? "Correct!" : "Insight"}
                                    </h4>
                                    <p className="text-slate-400 leading-relaxed text-sm">
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
