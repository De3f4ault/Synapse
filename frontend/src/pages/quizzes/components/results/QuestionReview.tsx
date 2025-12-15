import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionReviewProps {
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
}

/**
 * Review individual question results
 */
export const QuestionReview: React.FC<QuestionReviewProps> = ({
    questionText,
    userAnswer,
    correctAnswer,
    isCorrect,
}) => {
    return (
        <div className={cn(
            'p-6 rounded-xl border transition-all',
            isCorrect
                ? 'bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40'
                : 'bg-red-950/20 border-red-500/20 hover:border-red-500/40'
        )}>
            <div className="flex gap-4">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    isCorrect ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                    {isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                </div>

                <div className="flex-1 space-y-4">
                    <p className="text-base font-medium text-slate-200 leading-relaxed">
                        {questionText}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={cn(
                            "px-4 py-3 rounded-lg border",
                            isCorrect
                                ? "bg-emerald-500/5 border-emerald-500/10"
                                : "bg-red-500/5 border-red-500/10"
                        )}>
                            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1 opacity-70">
                                Your Answer
                            </div>
                            <div className={cn(
                                "text-sm font-medium",
                                isCorrect ? "text-emerald-400" : "text-red-400"
                            )}>
                                {userAnswer}
                            </div>
                        </div>

                        {!isCorrect && (
                            <div className="px-4 py-3 rounded-lg border bg-emerald-500/5 border-emerald-500/10">
                                <div className="text-[10px] uppercase tracking-wider font-semibold mb-1 opacity-70 text-emerald-400">
                                    Correct Answer
                                </div>
                                <div className="text-sm font-medium text-emerald-400">
                                    {correctAnswer}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
