/**
 * QuestionReview - Individual Question Review Card
 *
 * Shows question, user's answer, and correct answer.
 * Phase Q3.3: Shows related flashcards for incorrect questions.
 */

import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { GlassCard } from "@/shared/ui";
import { RelatedFlashcards } from "./RelatedFlashcards";

interface QuestionReviewProps {
    questionId: number;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string | null;
}

export const QuestionReview: React.FC<QuestionReviewProps> = ({
    questionId,
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
                isCorrect ? "border-accent-olive/20" : "border-destructive/20"
            )}
        >
            <div className="flex items-start gap-3">
                <div className="shrink-0 mt-1">
                    {isCorrect ? (
                        <CheckCircle size={20} className="text-accent-olive" />
                    ) : (
                        <XCircle size={20} className="text-destructive" />
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-foreground/70 mb-3">{questionText}</p>

                    <div className="space-y-2 text-sm">
                        <div className="flex gap-2">
                            <span className="text-muted-foreground">Your answer:</span>
                            <span
                                className={cn(
                                    "font-medium",
                                    isCorrect ? "text-accent-olive" : "text-destructive"
                                )}
                            >
                                {userAnswer}
                            </span>
                        </div>
                        {!isCorrect && (
                            <div className="flex gap-2">
                                <span className="text-muted-foreground">Correct:</span>
                                <span className="font-medium text-accent-olive">
                                    {correctAnswer}
                                </span>
                            </div>
                        )}
                        {explanation && (
                            <p className="text-muted-foreground mt-2 pt-2 border-t border-border">
                                {explanation}
                            </p>
                        )}
                    </div>

                    {/* Phase Q3.3: Related flashcards for incorrect questions */}
                    {!isCorrect && (
                        <RelatedFlashcards questionId={questionId} className="mt-4" />
                    )}
                </div>
            </div>
        </GlassCard>
    );
};
