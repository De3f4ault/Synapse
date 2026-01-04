/**
 * useDecks Hook
 * 
 * Data fetching hooks for deck operations.
 * Re-exports from existing hooks with proper typing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashcardsService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { DeckCreateInput, DeckUpdateInput } from '../../core';

/**
 * Fetch all decks
 */
export function useDecks() {
    return useQuery({
        queryKey: queryKeys.decks.list(),
        queryFn: () => FlashcardsService.listDecksApiV1DecksGet(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Fetch single deck by ID
 */
export function useDeck(deckId: number) {
    return useQuery({
        queryKey: queryKeys.decks.detail(deckId),
        queryFn: () => FlashcardsService.getDeckApiV1DecksDeckIdGet(deckId),
        enabled: !!deckId,
    });
}

/**
 * Create new deck
 */
export function useCreateDeck() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: DeckCreateInput) =>
            FlashcardsService.createDeckApiV1DecksPost(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            toast.success('Deck created successfully');
        },
        onError: (error) => {
            toast.error('Failed to create deck', {
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
        mutationFn: ({ deckId, data }: { deckId: number; data: DeckUpdateInput }) =>
            FlashcardsService.updateDeckApiV1DecksDeckIdPut(deckId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.decks.detail(variables.deckId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.list() });
            toast.success('Deck updated');
        },
        onError: (error) => {
            toast.error('Failed to update deck', {
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
        mutationFn: (deckId: number) =>
            FlashcardsService.deleteDeckApiV1DecksDeckIdDelete(deckId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            toast.success('Deck deleted');
        },
        onError: (error) => {
            toast.error('Failed to delete deck', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });
}
