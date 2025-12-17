// Quizzes hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QuizzesService } from '../generated';
import type {
    QuizResponse,
    QuizCreate,
    QuizAttemptStart,
    QuizResultResponse,
    AnswerSubmit,
} from '../generated';

const QUIZ_KEYS = {
    all: ['quizzes'] as const,
    lists: () => [...QUIZ_KEYS.all, 'list'] as const,
    list: (params?: unknown) => [...QUIZ_KEYS.lists(), params] as const,
    detail: (id: number) => [...QUIZ_KEYS.all, 'detail', id] as const,
};

/**
 * Hook to list quizzes
 */
export const useQuizzes = (params?: { page?: number; pageSize?: number }) => {
    return useQuery<QuizResponse[]>({
        queryKey: QUIZ_KEYS.list(params),
        queryFn: () => QuizzesService.listQuizzesApiV1QuizzesGet(params?.page, params?.pageSize),
    });
};

/**
 * Hook to create a new quiz
 */
export const useCreateQuiz = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: QuizCreate) => QuizzesService.createQuizApiV1QuizzesPost(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUIZ_KEYS.lists() });
        },
    });
};

/**
 * Hook to start a quiz attempt
 */
export const useStartQuizAttempt = () => {
    return useMutation<QuizAttemptStart, Error, number>({
        mutationFn: (quizId: number) => QuizzesService.startQuizAttemptApiV1QuizzesQuizIdStartPost(quizId),
    });
};

/**
 * Hook to submit quiz answers
 */
export const useSubmitQuizAttempt = () => {
    const queryClient = useQueryClient();
    return useMutation<QuizResultResponse, Error, { attemptId: number; answers: AnswerSubmit[] }>({
        mutationFn: ({ attemptId, answers }) =>
            QuizzesService.submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost(attemptId, answers),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUIZ_KEYS.all });
        },
    });
};
