/**
 * useCards Hook
 * Manages flashcard data fetching, mutations, and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getDueCardsApiV1CardsDueGet,
    getCardApiV1CardsCardIdGet,
    createCardApiV1CardsPost,
    updateCardApiV1CardsCardIdPut,
    deleteCardApiV1CardsCardIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { FlashcardCreateInput, FlashcardUpdateInput } from '../types/flashcards.types';

/**
 * Fetch cards for a specific deck
 */
export function useDeckCards(deckId: number) {
    return useQuery({
        queryKey: queryKeys.decks.cards(deckId),
                    queryFn: () => getDueCardsApiV1CardsDueGet({ deckId }),
                    enabled: !!deckId,
    });
}

/**
 * Fetch all due cards (optionally filtered by deck)
 */
export function useDueCards(deckId?: number) {
    return useQuery({
        queryKey: deckId ? queryKeys.decks.cards(deckId) : queryKeys.flashcards.due(),
                    queryFn: () =>
                    getDueCardsApiV1CardsDueGet({
                        deckId: deckId || undefined,
                    }),
    });
}

/**
 * Fetch single card by ID
 */
export function useCard(cardId: number) {
    return useQuery({
        queryKey: queryKeys.flashcards.detail(cardId),
                    queryFn: () => getCardApiV1CardsCardIdGet({ cardId }),
                    enabled: !!cardId,
    });
}

/**
 * Create new flashcard
 */
export function useCreateCard() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: FlashcardCreateInput) =>
        createCardApiV1CardsPost({ requestBody: data }),
                       onSuccess: (_, variables) => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(variables.deck_id) });
                           queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(variables.deck_id) });
                           toast.success('Memory fragment constructed');
                       },
                       onError: (error) => {
                           toast.error('Failed to construct fragment', {
                               description: error instanceof Error ? error.message : 'Unknown error',
                           });
                       },
    });
}

/**
 * Update existing flashcard
 */
export function useUpdateCard() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ cardId, data }: { cardId: number; data: FlashcardUpdateInput }) =>
        updateCardApiV1CardsCardIdPut({
            cardId,
            requestBody: data,
        }),
        onSuccess: (card) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.detail(card.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(card.deck_id) });
            toast.success('Memory fragment updated');
        },
        onError: (error) => {
            toast.error('Failed to update fragment', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });
}

/**
 * Delete flashcard
 */
export function useDeleteCard() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (cardId: number) =>
        deleteCardApiV1CardsCardIdDelete({ cardId }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all });
                           queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
                           toast.success('Memory fragment deleted');
                       },
                       onError: (error) => {
                           toast.error('Failed to delete fragment', {
                               description: error instanceof Error ? error.message : 'Unknown error',
                           });
                       },
    });
}

/**
 * Batch create multiple cards
 */
export function useBatchCreateCards() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (cards: FlashcardCreateInput[]) => {
            const results = await Promise.allSettled(
                cards.map((card) => createCardApiV1CardsPost({ requestBody: card }))
            );

            const successful = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;

            return { successful, failed, total: cards.length };
        },
        onSuccess: (result, variables) => {
            const deckId = variables[0]?.deck_id;
            if (deckId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(deckId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(deckId) });
            }

            toast.success(`${result.successful} fragments constructed successfully`);
            if (result.failed > 0) {
                toast.warning(`${result.failed} fragments failed to construct`);
            }
        },
        onError: (error) => {
            toast.error('Batch operation failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });
}

/**
 * Get card statistics for a deck
 */
export function useCardStats(deckId: number) {
    const { data: cards } = useDeckCards(deckId);

    if (!cards || cards.length === 0) {
        return {
            total: 0,
            new: 0,
            learning: 0,
            review: 0,
            mastered: 0,
            avgAccuracy: 0,
            avgInterval: 0,
        };
    }

    const stats = cards.reduce(
        (acc, card) => {
            acc[card.learning_state]++;
            acc.totalAccuracy += card.accuracy;
            acc.totalInterval += card.interval;
            return acc;
        },
        {
            new: 0,
            learning: 0,
            review: 0,
            mastered: 0,
            totalAccuracy: 0,
            totalInterval: 0,
        }
    );

    return {
        total: cards.length,
        new: stats.new,
        learning: stats.learning,
        review: stats.review,
        mastered: stats.mastered,
        avgAccuracy: stats.totalAccuracy / cards.length,
        avgInterval: Math.round(stats.totalInterval / cards.length),
    };
}
