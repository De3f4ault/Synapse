// Flashcards hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlashcardsService } from "../generated";
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
  ImportResult,
} from "../generated";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to list all decks
 */
export const useDecks = (params?: {
  tags?: string;
  isPublic?: boolean;
  page?: number;
  pageSize?: number;
}) => {
  return useQuery<DeckResponse[]>({
    queryKey: queryKeys.flashcards.list(params),
    queryFn: () =>
      FlashcardsService.listDecksApiV1DecksGet(
        params?.tags,
        params?.isPublic,
        params?.page,
        params?.pageSize,
      ),
  });
};

/**
 * Hook to get a specific deck
 */
export const useDeck = (deckId: number) => {
  return useQuery<DeckResponse>({
    queryKey: queryKeys.flashcards.detail(deckId),
    queryFn: () => FlashcardsService.getDeckApiV1DecksDeckIdGet(deckId),
    enabled: !!deckId,
  });
};

/**
 * Hook to create a new deck
 */
export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeckCreate) =>
      FlashcardsService.createDeckApiV1DecksPost(data),
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
      FlashcardsService.updateDeckApiV1DecksDeckIdPut(deckId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.flashcards.detail(variables.deckId),
      });
    },
  });
};

/**
 * Hook to delete a deck
 */
export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckId: number) =>
      FlashcardsService.deleteDeckApiV1DecksDeckIdDelete(deckId),
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
      FlashcardsService.generateFlashcardsApiV1DecksGeneratePost(data),
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
  return useMutation<FlashcardResponse, Error, FlashcardCreate>({
    mutationFn: (data: FlashcardCreate) =>
      FlashcardsService.createCardApiV1CardsPost(data),
    onSuccess: (newCard, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.flashcards.detail(variables.deck_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.flashcards.detail(newCard.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.due() });
    },
  });
};

/**
 * Hook to get due cards for review
 */
export const useDueCards = (params?: { deckId?: number; limit?: number }) => {
  return useQuery<FlashcardResponse[]>({
    queryKey: queryKeys.flashcards.due(params),
    queryFn: () =>
      FlashcardsService.getDueCardsApiV1CardsDueGet(
        params?.deckId,
        params?.limit,
      ),
  });
};

/**
 * Hook to get a specific card
 */
export const useCard = (cardId: number) => {
  return useQuery<FlashcardResponse>({
    queryKey: queryKeys.flashcards.detail(cardId),
    queryFn: () => FlashcardsService.getCardApiV1CardsCardIdGet(cardId),
    enabled: !!cardId,
  });
};

/**
 * ✅ NEW: Hook to update a flashcard
 */
export const useUpdateCard = () => {
  const queryClient = useQueryClient();
  return useMutation<
    FlashcardResponse,
    Error,
    { cardId: number; data: FlashcardUpdate }
  >({
    mutationFn: ({ cardId, data }: { cardId: number; data: FlashcardUpdate }) =>
      FlashcardsService.updateCardApiV1CardsCardIdPut(cardId, data),
    onSuccess: (updatedCard, variables) => {
      // Invalidate the specific card
      queryClient.invalidateQueries({
        queryKey: queryKeys.flashcards.detail(variables.cardId),
      });
      // Invalidate the deck that contains this card
      if (updatedCard.deck_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.flashcards.detail(updatedCard.deck_id),
        });
      }
      // Invalidate due cards list
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.due() });
    },
  });
};

/**
 * Hook to review a card (submit SM-2 quality rating)
 */
export const useReviewCard = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ReviewResult,
    Error,
    { cardId: number; data: ReviewSubmit }
  >({
    mutationFn: ({ cardId, data }) =>
      FlashcardsService.reviewCardApiV1CardsCardIdReviewPost(cardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.due() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.flashcards.detail(variables.cardId),
      });
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
    mutationFn: (cardId: number) =>
      FlashcardsService.deleteCardApiV1CardsCardIdDelete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
    },
  });
};

// ============================================================================
// Deck Export / Import
// ============================================================================

/**
 * Hook to export a deck as JSON
 */
export const useExportDeckJSON = (deckId: number, includeStats: boolean = true) => {
  return useQuery({
    queryKey: [...queryKeys.decks.detail(deckId), "export"],
    queryFn: () =>
      FlashcardsService.exportDeckApiV1DecksDeckIdExportGet(deckId, includeStats),
    enabled: false, // Only fetch on demand
  });
};

/**
 * Hook to export deck as CSV (triggers file download)
 */
export const useExportDeckCSV = () => {
  return useMutation({
    mutationFn: async (deckId: number) => {
      const csvContent = await FlashcardsService.exportDeckCsvEndpointApiV1DecksDeckIdExportCsvGet(deckId);
      // Trigger browser download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deck_${deckId}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
};

/**
 * Hook to import flashcards from a CSV file
 */
export const useImportDeckCSV = () => {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, { deckId: number; file: File }>({
    mutationFn: ({ deckId, file }) =>
      FlashcardsService.importDeckCsvApiV1DecksDeckIdImportCsvPost(
        deckId,
        { file },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.decks.cards(variables.deckId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.flashcards.detail(variables.deckId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.lists() });
    },
  });
};
