/**
 * QuestionReview - Individual Question Review Card
 *
 * Shows question, user's answer, and correct answer.
 */

import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { GlassCard } from "@/shared/ui";

interface QuestionReviewProps {
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string | null;
}

export const QuestionReview: React.FC<QuestionReviewProps> = ({
    questionText,
    userAnswer,
    correctAnswer,
    isCorrect,
    explanation,
}) => {
    return (
        <GlassCard
            className={cn(
                "p-5",
                isCorrect ? "border-emerald-500/20" : "border-red-500/20"
            )}
        >
            <div className="flex items-start gap-3">
                <div className="shrink-0 mt-1">
                    {isCorrect ? (
                        <CheckCircle size={20} className="text-emerald-400" />
                    ) : (
                        <XCircle size={20} className="text-red-400" />
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-slate-200 mb-3">{questionText}</p>

                    <div className="space-y-2 text-sm">
                        <div className="flex gap-2">
                            <span className="text-slate-500">Your answer:</span>
                            <span
                                className={cn(
                                    "font-medium",
                                    isCorrect ? "text-emerald-400" : "text-red-400"
                                )}
                            >
                                {userAnswer}
                            </span>
                        </div>
                        {!isCorrect && (
                            <div className="flex gap-2">
                                <span className="text-slate-500">Correct:</span>
                                <span className="font-medium text-emerald-400">
                                    {correctAnswer}
                                </span>
                            </div>
                        )}
                        {explanation && (
                            <p className="text-slate-400 mt-2 pt-2 border-t border-white/[0.04]">
                                {explanation}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};
