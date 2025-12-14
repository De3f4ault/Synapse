/**
 * AI Generation Hooks
 * 
 * Unified hooks for AI-powered content generation:
 * - Quiz generation from topic
 * - Flashcard generation from topic
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { getAuthToken } from '@/api/client';

// ============================================================================
// Quiz Generation
// ============================================================================

interface QuizGenerateRequest {
    topic: string;
    document_id?: number;
    num_questions?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
}

interface QuizGenerateResponse {
    quiz_id: number;
    title: string;
    description: string | null;
    difficulty: string;
    question_count: number;
    status: string;
    message: string;
}

/**
 * Hook for AI quiz generation
 */
export const useGenerateQuiz = () => {
    const queryClient = useQueryClient();

    return useMutation<QuizGenerateResponse, Error, QuizGenerateRequest>({
        mutationFn: async (data) => {
            const token = getAuthToken();

            const response = await fetch('/api/v1/quizzes/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                credentials: 'include',
                body: JSON.stringify({
                    topic: data.topic,
                    document_id: data.document_id,
                    num_questions: data.num_questions || 10,
                    difficulty: data.difficulty || 'medium'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate quiz');
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast.success('Quiz Generated!', {
                description: data.message
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
        },
        onError: (error) => {
            toast.error('Generation Failed', {
                description: error.message
            });
        }
    });
};

// ============================================================================
// Flashcard Generation
// ============================================================================

interface FlashcardGenerateRequest {
    topic: string;
    deck_name?: string;
    num_cards?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
}

interface FlashcardGenerateResponse {
    deck_id: number;
    deck_name: string;
    cards_generated: number;
    status: string;
    message: string;
}

/**
 * Hook for AI flashcard generation from topic
 */
export const useGenerateFlashcards = () => {
    const queryClient = useQueryClient();

    return useMutation<FlashcardGenerateResponse, Error, FlashcardGenerateRequest>({
        mutationFn: async (data) => {
            const token = getAuthToken();

            const response = await fetch('/api/v1/decks/generate-from-topic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                credentials: 'include',
                body: JSON.stringify({
                    topic: data.topic,
                    deck_name: data.deck_name,
                    num_cards: data.num_cards || 10,
                    difficulty: data.difficulty || 'medium',
                    tags: data.tags
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate flashcards');
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast.success('Flashcards Generated!', {
                description: data.message
            });
            // Invalidate decks list to show new deck
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
        },
        onError: (error) => {
            toast.error('Generation Failed', {
                description: error.message
            });
        }
    });
};

