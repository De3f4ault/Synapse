import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    startQuizAttemptApiV1QuizzesQuizIdStartPost,
    submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost,
} from '@/api/generated/services.gen';
import { QUERY_KEYS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { AnswerSubmit, QuizAttemptStart, QuizResultResponse } from '@/api/generated/types.gen';

/**
 * Hook for managing quiz attempts
 * Handles starting quiz, tracking answers, and submission
 */

interface UseQuizAttemptOptions {
    quizId: number;
    onComplete?: (result: QuizResultResponse) => void;
}

export function useQuizAttempt({ quizId, onComplete }: UseQuizAttemptOptions) {
    const [attempt, setAttempt] = useState<QuizAttemptStart | null>(null);
    const [answers, setAnswers] = useState<Map<number, string>>(new Map());
    const [startTime, setStartTime] = useState<number | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Start quiz mutation
    const { mutate: startQuiz, isPending: isStarting } = useMutation({
        mutationFn: () => startQuizAttemptApiV1QuizzesQuizIdStartPost({ quizId }),
                                                                     onSuccess: (result) => {
                                                                         setAttempt(result);
                                                                         setStartTime(Date.now());
                                                                         setAnswers(new Map());
                                                                         toast({
                                                                             title: 'Quiz Started',
                                                                             description: `${result.questions.length} questions to answer`,
                                                                         });
                                                                     },
                                                                     onError: (error) => {
                                                                         toast({
                                                                             title: 'Failed to Start Quiz',
                                                                             description: error instanceof Error ? error.message : 'An error occurred',
                                                                             variant: 'destructive',
                                                                         });
                                                                     },
    });

    // Submit quiz mutation
    const { mutate: submitQuiz, isPending: isSubmitting } = useMutation({
        mutationFn: () => {
            if (!attempt) throw new Error('No active attempt');

            const answersList: AnswerSubmit[] = Array.from(answers.entries()).map(
                ([questionId, answer]) => ({
                    question_id: questionId,
                    answer,
                })
            );

            return submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost({
                attemptId: attempt.attempt_id,
                requestBody: answersList,
            });
        },
        onSuccess: (result) => {
            toast({
                title: 'Quiz Submitted',
                description: `Score: ${result.percentage.toFixed(1)}%`,
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUIZZES] });
            onComplete?.(result);
        },
        onError: (error) => {
            toast({
                title: 'Failed to Submit Quiz',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            });
        },
    });

    // Set answer for a question
    const setAnswer = (questionId: number, answer: string) => {
        setAnswers((prev) => new Map(prev).set(questionId, answer));
    };

    // Get answer for a question
    const getAnswer = (questionId: number): string | undefined => {
        return answers.get(questionId);
    };

    // Calculate elapsed time
    const getElapsedTime = (): number => {
        if (!startTime) return 0;
        return Math.floor((Date.now() - startTime) / 1000);
    };

    // Check if all questions are answered
    const isComplete = (): boolean => {
        if (!attempt) return false;
        return attempt.questions.every((q) => answers.has(q.id));
    };

    return {
        attempt,
        answers,
        startQuiz,
        submitQuiz,
        setAnswer,
        getAnswer,
        isStarting,
        isSubmitting,
        isComplete: isComplete(),
        answeredCount: answers.size,
        totalQuestions: attempt?.questions.length || 0,
        elapsedTime: getElapsedTime(),
    };
}
