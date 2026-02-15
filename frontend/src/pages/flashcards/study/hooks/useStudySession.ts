/**
 * useStudySession Hook
 * 
 * Primary hook for managing a study session.
 * Handles session lifecycle, card fetching, and review submission.
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStudyStore } from '../state';
import {
    useFlashcardStore,
    sortByPriority,
    RATING_TO_API_QUALITY,
    type Flashcard,
    type ReviewRating,
} from '../../core';
import type { StudySessionStats } from '../../core';
import { FlashcardsService } from '@/api/generated';

interface UseStudySessionOptions {
    deckId: number;
    /** Maximum cards to include in session */
    limit?: number;
}

interface UseStudySessionResult {
    // Session state
    isLoading: boolean;
    isSessionActive: boolean;
    isSessionComplete: boolean;
    error: string | null;

    // Current card
    currentCard: Flashcard | null;
    isFlipped: boolean;
    progress: { current: number; total: number; completed: number };

    // Actions
    startSession: () => void;
    flipCard: () => void;
    submitReview: (rating: ReviewRating) => Promise<void>;
    getSessionStats: () => StudySessionStats;
    endSession: () => StudySessionStats | null;
}

export function useStudySession({ deckId, limit = 20 }: UseStudySessionOptions): UseStudySessionResult {
    const queryClient = useQueryClient();

    // Store selectors
    const store = useStudyStore();
    const setActiveDeck = useFlashcardStore((s) => s.setActiveDeck);

    // Fetch due cards
    const { data: dueCards, isLoading: isDueLoading, error: fetchError } = useQuery({
        queryKey: ['flashcards', 'due', deckId],
        queryFn: async () => {
            const response = await FlashcardsService.getDueCardsApiV1CardsDueGet(deckId, limit);
            return response as Flashcard[];
        },
        enabled: deckId > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fallback: Fetch all cards in deck if no due cards
    const { data: allCards, isLoading: isAllCardsLoading } = useQuery({
        queryKey: ['flashcards', 'deck', deckId, 'cards'],
        queryFn: async () => {
            const response = await FlashcardsService.listDeckCardsApiV1DecksDeckIdCardsGet(deckId, 1, limit);
            // Response might be { cards: [...] } or just an array
            const cards = Array.isArray(response) ? response : (response?.cards || response?.items || []);
            return cards as Flashcard[];
        },
        enabled: deckId > 0 && !isDueLoading && (!dueCards || dueCards.length === 0),
        staleTime: 5 * 60 * 1000,
    });

    const isLoading = isDueLoading || ((!dueCards || dueCards.length === 0) && isAllCardsLoading);

    // Review mutation
    const reviewMutation = useMutation({
        mutationFn: async ({ cardId, quality, timeTakenMs }: { cardId: number; quality: number; timeTakenMs: number }) => {
            return FlashcardsService.reviewCardApiV1CardsCardIdReviewPost(cardId, {
                quality,
                time_taken_ms: timeTakenMs,
            });
        },
        onSuccess: () => {
            // Invalidate due cards query after successful review
            queryClient.invalidateQueries({ queryKey: ['flashcards', 'due', deckId] });
        },
    });

    // Sync deckId with core store
    useEffect(() => {
        setActiveDeck(deckId);
    }, [deckId, setActiveDeck]);

    // Session boundary: reset when deckId changes
    useEffect(() => {
        if (store.deckId !== deckId) {
            store.resetForDeck(deckId);
        }
    }, [deckId, store.deckId]);

    // Start session handler - use due cards first, fall back to all cards
    const startSession = useCallback(() => {
        const cardsToStudy = (dueCards && dueCards.length > 0) ? dueCards : allCards;
        
        if (!cardsToStudy || cardsToStudy.length === 0) {
            store.setStudyError('No cards available in this deck');
            return;
        }

        // Sort cards by priority
        const sortedCards = sortByPriority(cardsToStudy);
        store.startSession(deckId, sortedCards);
    }, [dueCards, allCards, deckId, store]);

    // Flip card handler
    const flipCard = useCallback(() => {
        store.flipCard();
    }, [store]);

    // Submit review handler
    const submitReview = useCallback(async (rating: ReviewRating) => {
        const currentCard = store.getCurrentCard();
        if (!currentCard) return;

        // Record locally first (optimistic)
        const progress = store.recordReview(rating);
        if (!progress) return;

        // Server handles actual calculation, we just send quality


        // Submit to server
        try {
            await reviewMutation.mutateAsync({
                cardId: currentCard.id,
                quality: RATING_TO_API_QUALITY[rating],
                timeTakenMs: progress.timeTakenMs,
            });

            // Move to next card or complete session
            const hasNext = store.nextCard();
            if (!hasNext) {
                // Session complete - stats available via getSessionStats()
            }
        } catch (error) {
            store.setStudyError(error instanceof Error ? error.message : 'Failed to submit review');
        }
    }, [store, reviewMutation]);

    // Get stats without resetting the store
    const getSessionStats = useCallback(() => {
        return store.getSessionStats();
    }, [store]);

    // End session handler (resets the store — only use when navigating away)
    const endSession = useCallback(() => {
        return store.endSession();
    }, [store]);

    // Computed values
    const currentCard = store.getCurrentCard();
    const progress = {
        current: store.currentIndex + 1,
        total: store.queue.length,
        completed: store.completed.length,
    };

    return {
        isLoading,
        isSessionActive: store.sessionStartTime !== null,
        isSessionComplete: store.isSessionComplete(),
        error: store.studyError || (fetchError instanceof Error ? fetchError.message : null),
        currentCard,
        isFlipped: store.isFlipped,
        progress,
        startSession,
        flipCard,
        submitReview,
        getSessionStats,
        endSession,
    };
}
