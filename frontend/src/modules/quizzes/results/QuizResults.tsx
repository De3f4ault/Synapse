/**
 * QuizResults - Results View Container
 *
 * Main component for displaying quiz results.
 * Orchestrates summary, insights, and detailed review.
 */

import { useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { ResultsSummary } from "./ResultsSummary";
import { QuestionReview } from "./QuestionReview";
import { AIInsights } from "./AIInsights";
import type { QuizPerformance } from "../core";
import type { QuizResultResponse, QuizInsightsResponse } from "@/api/generated";
import { AuroraBackground } from "@/shared/ui";

interface QuizResultsProps {
    results: QuizResultResponse;
    performance: QuizPerformance;
    insights: QuizInsightsResponse | null | undefined;
    isLoadingInsights: boolean;
    insightsError: Error | null;
    onRefetchInsights: () => void;
    onReturn: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
    results,
    performance,
    insights,
    isLoadingInsights,
    insightsError,
    onRefetchInsights,
    onReturn,
}) => {
    const [view, setView] = useState<"summary" | "review">("summary");

    return (
        <AuroraBackground className="h-full flex flex-col relative overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" fixed={false}>
            <style>{`.quiz-review-scroll { scrollbar-width: none; } .quiz-review-scroll::-webkit-scrollbar { display: none; }`}</style>
            {/* Back to Summary Button (when in review) */}
            {view === "review" && (
                <div className="absolute top-0 left-0 right-0 z-20 p-6 bg-gradient-to-b from-[#08080c] to-transparent pointer-events-none">
                    <button
                        onClick={() => setView("summary")}
                        className="pointer-events-auto flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2 rounded-lg border border-white/[0.06]"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-sm font-medium">Back to Summary</span>
                    </button>
                </div>
            )}

            {view === "summary" ? (
                <ResultsSummary performance={performance} onReturn={onReturn}>
                    {/* AI Insights */}
                    <AIInsights
                        insights={insights}
                        isLoading={isLoadingInsights}
                        error={insightsError}
                        onRefetch={onRefetchInsights}
                    />

                    {/* Review Link */}
                    <div className="pt-4 border-t border-white/[0.04]">
                        <button
                            onClick={() => setView("review")}
                            className="text-slate-400 hover:text-white text-sm flex items-center gap-2 justify-center mx-auto transition-colors"
                        >
                            Review Detailed Answers
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </ResultsSummary>
            ) : (
                <div className="quiz-review-scroll h-full overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-6 pt-24 pb-20">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">
                                    Detailed Review
                                </h2>
                                <p className="text-slate-400">
                                    Review your answers to improve retention
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Correct
                                </div>
                                <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Incorrect
                                </div>
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-4">
                            {results.answers.map((answer) => (
                                <QuestionReview
                                    key={answer.question_id}
                                    questionId={answer.question_id}
                                    questionText={answer.question_text}
                                    userAnswer={answer.your_answer}
                                    correctAnswer={answer.correct_answer}
                                    isCorrect={answer.is_correct}
                                    explanation={answer.explanation}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AuroraBackground>
    );
};
