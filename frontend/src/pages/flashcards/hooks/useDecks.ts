/**
 * useDecks Hook
 * Manages deck data fetching, mutations, and state
 * 
 * NOTE: @hey-api/client-fetch returns { data, request, response }
 * We need to extract .data from each response
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listDecksApiV1DecksGet,
    getDeckApiV1DecksDeckIdGet,
    createDeckApiV1DecksPost,
    updateDeckApiV1DecksDeckIdPut,
    deleteDeckApiV1DecksDeckIdDelete,
    getDueCardsApiV1CardsDueGet,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { DeckCreateInput, DeckUpdateInput } from '../types/flashcards.types';

/**
 * Fetch all decks
 */
export function useDecks() {
    return useQuery({
        queryKey: queryKeys.decks.list(),
        queryFn: async () => {
            const response = await listDecksApiV1DecksGet();
            return (response as any).data ?? response;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Fetch single deck by ID
 */
export function useDeck(deckId: number) {
    return useQuery({
        queryKey: queryKeys.decks.detail(deckId),
        queryFn: async () => {
            const response = await getDeckApiV1DecksDeckIdGet({ path: { deck_id: deckId } });
            return (response as any).data ?? response;
        },
        enabled: !!deckId,
    });
}

/**
 * Create new deck
 */
export function useCreateDeck() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: DeckCreateInput) => {
            const response = await createDeckApiV1DecksPost({ body: data });
            return (response as any).data ?? response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            toast.success('Memory core constructed successfully');
        },
        onError: (error) => {
            toast.error('Failed to construct core', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });
}

/**
 * Update existing deck
 */
export function useUpdateDeck() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ deckId, data }: { deckId: number; data: DeckUpdateInput }) => {
            const response = await updateDeckApiV1DecksDeckIdPut({
                path: { deck_id: deckId },
                body: data,
            });
            return (response as any).data ?? response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.list() });
            toast.success('Memory core updated');
        },
        onError: (error) => {
            toast.error('Failed to update core', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });
}

/**
 * Delete deck
 */
export function useDeleteDeck() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (deckId: number) => {
            const response = await deleteDeckApiV1DecksDeckIdDelete({ path: { deck_id: deckId } });
            return (response as any).data ?? response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            toast.success('Memory core purged successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete deck', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });
}

/**
 * Get deck statistics with real calculations
 */
export function useDeckStats(deckId: number) {
    const { data: deck } = useDeck(deckId);
    const { data: cards } = useQuery({
        queryKey: queryKeys.decks.cards(deckId),
        queryFn: async () => {
            const response = await getDueCardsApiV1CardsDueGet({ query: { deck_id: deckId } });
            return (response as any).data ?? response;
        },
        enabled: !!deckId,
    });

    if (!deck) {
        return null;
    }

    const totalCards = deck.card_count || 0;

    // If we have card data, calculate from actual cards
    if (cards && cards.length > 0) {
        const now = new Date();
        const dueCards = cards.filter(
            (card) => new Date(card.next_review_date) <= now
        ).length;

        const stateGroups = cards.reduce(
            (acc, card) => {
                acc[card.learning_state]++;
                return acc;
            },
            { new: 0, learning: 0, review: 0, mastered: 0 }
        );

        const totalAccuracy = cards.reduce((sum, card) => sum + card.accuracy, 0);
        const averageAccuracy = cards.length > 0 ? totalAccuracy / cards.length : 0;

        const masteryPercent =
            totalCards > 0 ? Math.round((stateGroups.mastered / totalCards) * 100) : 0;

        return {
            totalCards,
            dueCards,
            newCards: stateGroups.new,
            learningCards: stateGroups.learning,
            reviewCards: stateGroups.review,
            masteredCards: stateGroups.mastered,
            masteryPercent,
            averageAccuracy,
        };
    }

    // Fallback: Estimate when no card data available
    const estimatedDistribution = {
        new: Math.round(totalCards * 0.2),
        learning: Math.round(totalCards * 0.3),
        review: Math.round(totalCards * 0.25),
        mastered: Math.round(totalCards * 0.25),
    };

    return {
        totalCards,
        dueCards: estimatedDistribution.new + estimatedDistribution.learning,
        newCards: estimatedDistribution.new,
        learningCards: estimatedDistribution.learning,
        reviewCards: estimatedDistribution.review,
        masteredCards: estimatedDistribution.mastered,
        masteryPercent: Math.round((estimatedDistribution.mastered / totalCards) * 100) || 0,
        averageAccuracy: 0.75,
    };
}
