import { useState } from 'react';
import { useMutation, useQueryClient } from '@tantml:react-query';
import { toast } from 'sonner';
import {  createQuizApiV1QuizzesPost , QuizzesService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';

// TODO: Move to src/api/services/gemini.ts
const mockGenerateQuizSchema = async (topic: string) => {
    await new Promise((r) => setTimeout(r, 2000));
    return {
        title: `Protocol: ${topic.toUpperCase()}`,
        description: `Tactical simulation regarding ${topic}. Constructed by The Architect AI.`,
        time_limit_minutes: 15,
        difficulty: 'Hard',
    };
};

/**
 * Custom hook for quiz builder (AI generation)
 */
export function useQuizBuilder() {
    const queryClient = useQueryClient();
    const [isGenerating, setIsGenerating] = useState(false);

    const createMutation = useMutation({
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

    const generateAndCreate = async (topic: string) => {
        if (!topic.trim()) return;

        setIsGenerating(true);

        try {
            // TODO: Replace with actual Gemini API call
            const schema = await mockGenerateQuizSchema(topic);

            // Create the quiz
            createMutation.mutate({
                requestBody: {
                    title: schema.title,
                    description: schema.description,
                    time_limit_minutes: schema.time_limit_minutes,
                    difficulty: schema.difficulty,
                },
            });
        } catch (e) {
            toast.error('NEURAL LINK FAILURE');
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        generateAndCreate,
        isGenerating: isGenerating || createMutation.isPending,
        isSuccess: createMutation.isSuccess,
    };
}
