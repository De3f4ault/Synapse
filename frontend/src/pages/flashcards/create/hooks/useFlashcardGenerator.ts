/**
 * useFlashcardGenerator Hook
 * 
 * React hook wrapper around the generator engine.
 * Provides mutation state, error handling, and cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import {
    generateFlashcardsFromTopic,
    validateGeneratorRequest,
    type GeneratorRequest,
    type GeneratorResponse,
} from '../engine';

interface UseFlashcardGeneratorResult {
    generate: (
        request: GeneratorRequest,
        options?: {
            onSuccess?: (data: GeneratorResponse) => void;
            onError?: (error: Error) => void;
        }
    ) => void;
    generateAsync: (request: GeneratorRequest) => Promise<GeneratorResponse>;
    isGenerating: boolean;
    error: string | null;
    data: GeneratorResponse | null;
    reset: () => void;
}

export function useFlashcardGenerator(): UseFlashcardGeneratorResult {
    const queryClient = useQueryClient();

    const mutation = useMutation<GeneratorResponse, Error, GeneratorRequest>({
        mutationFn: async (request) => {
            // Validate first
            const validationError = validateGeneratorRequest(request);
            if (validationError) {
                throw new Error(validationError.message);
            }

            return generateFlashcardsFromTopic(request);
        },
        onSuccess: (data) => {
            toast.success('Flashcards Generated!', {
                description: data.message,
            });
            // Invalidate decks list to show new deck
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
        },
        onError: (error) => {
            toast.error('Generation Failed', {
                description: error.message,
            });
        },
    });

    return {
        generate: mutation.mutate,
        generateAsync: mutation.mutateAsync,
        isGenerating: mutation.isPending,
        error: mutation.error?.message ?? null,
        data: mutation.data ?? null,
        reset: mutation.reset,
    };
}
