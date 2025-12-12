import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    listQuizzesApiV1QuizzesGet,
    createQuizApiV1QuizzesPost,
    deleteQuizApiV1QuizzesQuizIdDelete,
} from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Custom hook for managing quizzes
 * 
 * NOTE: @hey-api/client-fetch returns { data, request, response }
 * We need to extract .data from each response
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
        queryFn: async () => {
            const response = await listQuizzesApiV1QuizzesGet();
            return (response as any).data ?? response;
        },
    });

    // Create quiz mutation
    const createQuizMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await createQuizApiV1QuizzesPost({ body: data });
            return (response as any).data ?? response;
        },
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
        mutationFn: async (quizId: number) => {
            const response = await deleteQuizApiV1QuizzesQuizIdDelete({ path: { quiz_id: quizId } });
            return (response as any).data ?? response;
        },
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

