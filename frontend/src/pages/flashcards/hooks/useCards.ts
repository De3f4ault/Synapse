/**
 * useCards Hook
 * Manages flashcard data fetching, mutations, and operations
 * 
 * NOTE: @hey-api/client-fetch returns { data, request, response }
 * We need to extract .data from each response
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getDueCardsApiV1CardsDueGet,
    getCardApiV1CardsCardIdGet,
    createCardApiV1CardsPost,
    updateCardApiV1CardsCardIdPut,
    deleteCardApiV1CardsCardIdDelete,
} from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { FlashcardCreateInput, FlashcardUpdateInput } from '../types/flashcards.types';

/**
 * Fetch cards for a specific deck
 */
export function useDeckCards(deckId: number) {
    return useQuery({
        queryKey: queryKeys.decks.cards(deckId),
        queryFn: async () => {
            const response = await getDueCardsApiV1CardsDueGet({ query: { deck_id: deckId } });
            return (response as any).data ?? response;
        },
        enabled: !!deckId,
    });
}

/**
 * Fetch all due cards (optionally filtered by deck)
 */
export function useDueCards(deckId?: number) {
    return useQuery({
        queryKey: deckId ? queryKeys.decks.cards(deckId) : queryKeys.flashcards.due(),
        queryFn: async () => {
            const response = await getDueCardsApiV1CardsDueGet({
                query: { deck_id: deckId || undefined },
            });
            return (response as any).data ?? response;
        },
    });
}

/**
 * Fetch single card by ID
 */
export function useCard(cardId: number) {
    return useQuery({
        queryKey: queryKeys.flashcards.detail(cardId),
        queryFn: async () => {
            const response = await getCardApiV1CardsCardIdGet({ path: { card_id: cardId } });
            return (response as any).data ?? response;
        },
        enabled: !!cardId,
    });
}

/**
 * Create new flashcard
 */
export function useCreateCard() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: FlashcardCreateInput) => {
            const response = await createCardApiV1CardsPost({ body: data });
            return (response as any).data ?? response;
        },
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
        mutationFn: async ({ cardId, data }: { cardId: number; data: FlashcardUpdateInput }) => {
            const response = await updateCardApiV1CardsCardIdPut({
                path: { card_id: cardId },
                body: data,
            });
            return (response as any).data ?? response;
        },
        onSuccess: (card: any, variables) => {
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
        mutationFn: async (cardId: number) => {
            const response = await deleteCardApiV1CardsCardIdDelete({ path: { card_id: cardId } });
            return (response as any).data ?? response;
        },
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
                cards.map((card) => createCardApiV1CardsPost({ body: card }))
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
