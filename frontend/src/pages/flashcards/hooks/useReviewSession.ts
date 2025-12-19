/**
 * useReviewSession Hook
 * Manages review session state and interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashcardsService } from '@/api/generated';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type {
    Flashcard,
    ReviewQuality,
    ReviewSession,
    ReviewResult,
    SessionStats,
} from '../types/flashcards.types';
import { createBalancedSession, calculateSessionStats } from '../utils/cardScheduler';

interface UseReviewSessionOptions {
    cards: Flashcard[];
    deckId?: number;
    sessionLength?: number;
    onComplete?: (stats: SessionStats) => void;
}

/**
 * Manage flashcard review session
 */
export function useReviewSession({
    cards,
    deckId,
    sessionLength = 20,
    onComplete,
}: UseReviewSessionOptions) {
    const queryClient = useQueryClient();

    // Initialize session
    const [session, setSession] = useState<ReviewSession>(() => {
        const sessionCards = createBalancedSession(cards, sessionLength);
        return {
            deckId,
            cards: sessionCards,
            currentIndex: 0,
            completed: 0,
            correct: 0,
            incorrect: 0,
            startTime: Date.now(),
        };
    });

    const [results, setResults] = useState<ReviewResult[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Reinitialize session when cards become available
    useEffect(() => {
        // Only reinitialize if cards just became available and session is not yet initialized
        if (cards.length > 0 && !isInitialized) {
            const sessionCards = createBalancedSession(cards, sessionLength);
            setSession({
                deckId,
                cards: sessionCards,
                currentIndex: 0,
                completed: 0,
                correct: 0,
                incorrect: 0,
                startTime: Date.now(),
            });
            setIsInitialized(true);
        }
    }, [cards, sessionLength, deckId, isInitialized]);

    // Review mutation
    const { mutate: submitReview, isPending } = useMutation({
        mutationFn: ({ cardId, quality }: { cardId: number; quality: ReviewQuality }) => {
            const qualityMap = { again: 0, hard: 1, good: 3, easy: 5 };
            return FlashcardsService.reviewCardApiV1CardsCardIdReviewPost(cardId, {
                quality: qualityMap[quality],
                time_taken_ms: 0,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all });
            if (deckId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.decks.cards(deckId) });
            }
        },
        onError: (error) => {
            toast.error('Failed to submit review', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Current card
    const currentCard = session.cards[session.currentIndex] || null;
    const isLastCard = session.currentIndex >= session.cards.length - 1;
    const progress = ((session.currentIndex + 1) / session.cards.length) * 100;

    // Flip card
    const flipCard = useCallback(() => {
        setIsFlipped((prev) => !prev);
    }, []);

    // Submit review
    const reviewCard = useCallback(
        (quality: ReviewQuality) => {
            if (!currentCard || isPending) return;

            const wasCorrect = quality === 'good' || quality === 'easy';
            const timeTaken = Date.now() - session.startTime;

            // Save result
            const result: ReviewResult = {
                card: currentCard,
                quality,
                timeTaken,
                wasCorrect,
            };
            setResults((prev) => [...prev, result]);

            // Submit to API
            submitReview({ cardId: currentCard.id, quality });

            // Update session stats
            setSession((prev) => ({
                ...prev,
                completed: prev.completed + 1,
                correct: wasCorrect ? prev.correct + 1 : prev.correct,
                incorrect: !wasCorrect ? prev.incorrect + 1 : prev.incorrect,
            }));

            // Move to next card or end session
            setTimeout(() => {
                if (isLastCard) {
                    endSession();
                } else {
                    setSession((prev) => ({
                        ...prev,
                        currentIndex: prev.currentIndex + 1,
                    }));
                    setIsFlipped(false);
                }
            }, 300);
        },
        [currentCard, isLastCard, isPending, session.startTime, submitReview]
    );

    // End session
    const endSession = useCallback(() => {
        const endTime = Date.now();
        const duration = Math.floor((endTime - session.startTime) / 1000);
        const totalReviewed = session.correct + session.incorrect;
        const accuracy = totalReviewed > 0 ? (session.correct / totalReviewed) * 100 : 0;
        const cardsPerMinute = duration > 0 ? (totalReviewed / duration) * 60 : 0;

        const stats: SessionStats = {
            totalReviewed,
            correct: session.correct,
            incorrect: session.incorrect,
            accuracy,
            duration,
            cardsPerMinute,
        };

        setSession((prev) => ({ ...prev, endTime }));
        setSessionEnded(true);

        if (onComplete) {
            onComplete(stats);
        }
    }, [session, onComplete]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (sessionEnded || !currentCard) return;

            // Space to flip
            if (e.key === ' ' && !isFlipped) {
                e.preventDefault();
                flipCard();
            }

            // Number keys for review (only when flipped)
            if (isFlipped) {
                const keyMap: Record<string, ReviewQuality> = {
                    '1': 'again',
                    '2': 'hard',
                    '3': 'good',
                    '4': 'easy',
                };

                if (e.key in keyMap) {
                    e.preventDefault();
                    reviewCard(keyMap[e.key] as ReviewQuality);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isFlipped, sessionEnded, currentCard, flipCard, reviewCard]);

    // Session timer
    const [elapsedTime, setElapsedTime] = useState(0);
    useEffect(() => {
        if (sessionEnded) return;

        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - session.startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [session.startTime, sessionEnded]);

    return {
        // Session data
        session,
        currentCard,
        results,
        isLastCard,
        sessionEnded,

        // State
        isFlipped,
        isPending,
        progress,
        elapsedTime,

        // Actions
        flipCard,
        reviewCard,
        endSession,

        // Helpers
        remainingCards: session.cards.length - session.currentIndex,
        sessionStats: calculateSessionStats(session.cards, elapsedTime),
    };
}

/**
 * Format elapsed time as MM:SS
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
