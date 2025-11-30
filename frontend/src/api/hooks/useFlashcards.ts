// Flashcards hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    listDecksApiV1DecksGet,
    createDeckApiV1DecksPost,
    getDeckApiV1DecksDeckIdGet,
    updateDeckApiV1DecksDeckIdPut,
    deleteDeckApiV1DecksDeckIdDelete,
    generateFlashcardsApiV1DecksGeneratePost,
    createCardApiV1CardsPost,
    getDueCardsApiV1CardsDueGet,
    reviewCardApiV1CardsCardIdReviewPost,
    getCardApiV1CardsCardIdGet,
    updateCardApiV1CardsCardIdPut,
    deleteCardApiV1CardsCardIdDelete,
} from '../generated';
import type {
    DeckResponse,
    DeckCreate,
    DeckUpdate,
    FlashcardResponse,
    FlashcardCreate,
    FlashcardUpdate,
    FlashcardGenerateRequest,
    ReviewSubmit,
    ReviewResult,
} from '../generated';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to list all decks
 */
export const useDecks = (params?: { tags?: string; isPublic?: boolean; page?: number; pageSize?: number }) => {
    return useQuery<DeckResponse[]>({
        queryKey: queryKeys.flashcards.list(params),
                                    queryFn: () => listDecksApiV1DecksGet(params || {}),
    });
};

/**
 * Hook to get a specific deck
 */
export const useDeck = (deckId: number) => {
    return useQuery<DeckResponse>({
        queryKey: queryKeys.flashcards.detail(deckId),
                                  queryFn: () => getDeckApiV1DecksDeckIdGet({ deckId }),
                                  enabled: !!deckId,
    });
};

/**
 * Hook to create a new deck
 */
export const useCreateDeck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: DeckCreate) => createDeckApiV1DecksPost({ requestBody: data }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
                       },
    });
};

/**
 * Hook to update a deck
 */
export const useUpdateDeck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ deckId, data }: { deckId: number; data: DeckUpdate }) =>
        updateDeckApiV1DecksDeckIdPut({ deckId, requestBody: data }),
                       onSuccess: (_, variables) => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.detail(variables.deckId) });
                       },
    });
};

/**
 * Hook to delete a deck
 */
export const useDeleteDeck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (deckId: number) => deleteDeckApiV1DecksDeckIdDelete({ deckId }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
                       },
    });
};

/**
 * Hook to generate flashcards from a document
 */
export const useGenerateFlashcards = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: FlashcardGenerateRequest) =>
        generateFlashcardsApiV1DecksGeneratePost({ requestBody: data }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
                       },
    });
};

/**
 * Hook to create a flashcard
 */
export const useCreateCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: FlashcardCreate) => createCardApiV1CardsPost({ requestBody: data }),
                       onSuccess: (_, variables) => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.detail(variables.deck_id) });
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.cards.due() });
                       },
    });
};

/**
 * Hook to get due cards for review
 */
export const useDueCards = (params?: { deckId?: number; limit?: number }) => {
    return useQuery<FlashcardResponse[]>({
        queryKey: queryKeys.flashcards.cards.due(params),
                                         queryFn: () => getDueCardsApiV1CardsDueGet(params || {}),
    });
};

/**
 * Hook to get a specific card
 */
export const useCard = (cardId: number) => {
    return useQuery<FlashcardResponse>({
        queryKey: queryKeys.flashcards.cards.detail(cardId),
                                       queryFn: () => getCardApiV1CardsCardIdGet({ cardId }),
                                       enabled: !!cardId,
    });
};

/**
 * ✅ NEW: Hook to update a flashcard
 */
export const useUpdateCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cardId, data }: { cardId: number; data: FlashcardUpdate }) =>
        updateCardApiV1CardsCardIdPut({ cardId, requestBody: data }),
                       onSuccess: (updatedCard, variables) => {
                           // Invalidate the specific card
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.cards.detail(variables.cardId) });
                           // Invalidate the deck that contains this card
                           if (updatedCard.deck_id) {
                               queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.detail(updatedCard.deck_id) });
                           }
                           // Invalidate due cards list
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.cards.due() });
                       },
    });
};

/**
 * Hook to review a card (submit SM-2 quality rating)
 */
export const useReviewCard = () => {
    const queryClient = useQueryClient();
    return useMutation<ReviewResult, Error, { cardId: number; data: ReviewSubmit }>({
        mutationFn: ({ cardId, data }) =>
        reviewCardApiV1CardsCardIdReviewPost({ cardId, requestBody: data }),
                                                                                    onSuccess: (_, variables) => {
                                                                                        queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.cards.due() });
                                                                                        queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.cards.detail(variables.cardId) });
                                                                                        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
                                                                                    },
    });
};

/**
 * Hook to delete a card
 */
export const useDeleteCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (cardId: number) => deleteCardApiV1CardsCardIdDelete({ cardId }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.cards.lists() });
                           queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
                       },
    });
};
