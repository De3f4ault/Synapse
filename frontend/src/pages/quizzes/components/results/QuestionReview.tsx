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
            'p-4 rounded-lg border',
            isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
        )}>
        <div className="flex items-start gap-3 mb-3">
        {isCorrect ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-white flex-1">{questionText}</p>
        </div>

        <div className="ml-8 space-y-2 text-xs">
        <div className={cn(
            'p-2 rounded',
            isCorrect ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
        )}>
        <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
        Your Answer:
        </span>{' '}
        {userAnswer}
        </div>

        {!isCorrect && (
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-300">
            <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            Correct Answer:
            </span>{' '}
            {correctAnswer}
            </div>
        )}
        </div>
        </div>
    );
};
