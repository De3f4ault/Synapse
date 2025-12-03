import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    listQuizzesApiV1QuizzesGet,
    createQuizApiV1QuizzesPost,
    deleteQuizApiV1QuizzesQuizIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Custom hook for managing quizzes
 */
export function useQuizzes() {
    const queryClient = useQueryClient();

    // Fetch all quizzes
    const {
        data: quizzes,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.quizzes.list(),
                 queryFn: () => listQuizzesApiV1QuizzesGet(),
    });

    // Create quiz mutation
    const createQuizMutation = useMutation({
        mutationFn: createQuizApiV1QuizzesPost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
            toast.success('SIMULATION CONSTRUCTED SUCCESSFULLY');
        },
        onError: (error) => {
            toast.error('CONSTRUCTION FAILED', {
                description: error instanceof Error ? error.message : 'Neural link failure',
            });
        },
    });

    // Delete quiz mutation
    const deleteQuizMutation = useMutation({
        mutationFn: (quizId: number) => deleteQuizApiV1QuizzesQuizIdDelete({ quizId }),
                                           onSuccess: () => {
                                               queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
                                               toast.success('SIMULATION ARCHIVED');
                                           },
                                           onError: (error) => {
                                               toast.error('ARCHIVE FAILED', {
                                                   description: error instanceof Error ? error.message : 'Unknown error',
                                               });
                                           },
    });

    return {
        quizzes,
        isLoading,
        error,
        refetch,
        createQuiz: createQuizMutation.mutate,
        deleteQuiz: deleteQuizMutation.mutate,
        isCreating: createQuizMutation.isPending,
        isDeleting: deleteQuizMutation.isPending,
    };
}
