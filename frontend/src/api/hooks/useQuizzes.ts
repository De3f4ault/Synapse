// Quizzes hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createQuizApiV1QuizzesPost,
    listQuizzesApiV1QuizzesGet,
    startQuizAttemptApiV1QuizzesQuizIdStartPost,
    submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost,
} from '../generated';
import type {
    QuizResponse,
    QuizCreate,
    QuizAttemptStart,
    QuizResultResponse,
    AnswerSubmit,
} from '../generated';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to list quizzes
 */
export const useQuizzes = (params?: { page?: number; pageSize?: number }) => {
    return useQuery<QuizResponse[]>({
        queryKey: queryKeys.quizzes.list(params),
                                    queryFn: () => listQuizzesApiV1QuizzesGet(params || {}),
    });
};

/**
 * Hook to create a new quiz
 */
export const useCreateQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: QuizCreate) => createQuizApiV1QuizzesPost({ requestBody: data }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.lists() });
                       },
    });
};

/**
 * Hook to start a quiz attempt
 */
export const useStartQuizAttempt = () => {
    return useMutation<QuizAttemptStart, Error, number>({
        mutationFn: (quizId: number) => startQuizAttemptApiV1QuizzesQuizIdStartPost({ quizId }),
    });
};

/**
 * Hook to submit quiz answers
 */
export const useSubmitQuizAttempt = () => {
    const queryClient = useQueryClient();
    return useMutation<QuizResultResponse, Error, { attemptId: number; answers: AnswerSubmit[] }>({
        mutationFn: ({ attemptId, answers }) =>
        submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost({
            attemptId,
            requestBody: answers,
        }),
        onSuccess: () => {
            // Invalidate analytics and study data after quiz completion
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.study.all });
        },
    });
};
