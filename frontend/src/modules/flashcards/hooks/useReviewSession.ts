import { useMutation, useQueryClient } from '@tanstack/react-query';
import {  reviewCardApiV1CardsCardIdReviewPost , FlashcardsService } from '@/api/generated';
import { QUERY_KEYS } from '@/lib/constants';
import { useReviewStore } from '../stores/reviewStore';
import { useToast } from '@/hooks/use-toast';
import type { ReviewSubmit } from '@/api/generated';

/**
 * Hook for managing flashcard review session
 * Handles review submission and SM-2 algorithm integration
 */

export function useReviewSession() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { cards, currentIndex, cardStartTime, nextCard, recordReview } = useReviewStore();

    const currentCard = cards[currentIndex];

    // Submit review mutation
    const { mutate: submitReview, isPending } = useMutation({
        mutationFn: async ({ cardId, quality }: { cardId: number; quality: number }) => {
            const timeTakenMs = cardStartTime ? Date.now() - cardStartTime : 0;

            const data: ReviewSubmit = {
                quality,
                time_taken_ms: timeTakenMs,
            };

            return reviewCardApiV1CardsCardIdReviewPost({
                cardId,
                requestBody: data,
            });
        },
        onSuccess: (result, variables) => {
            // Record review in store
            recordReview(variables.quality);

            // Invalidate queries to refresh due cards
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.FLASHCARDS, 'due']
            });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.FLASHCARDS, 'card', variables.cardId]
            });

            // Show success feedback
            const qualityLabel = getQualityLabel(variables.quality);
            toast({
                title: 'Review Submitted',
                description: `${qualityLabel} - Next review: ${formatNextReview(result.next_review_date)}`,
            });

            // Move to next card after brief delay
            setTimeout(() => {
                nextCard();
            }, 500);
        },
        onError: (error) => {
            toast({
                title: 'Review Failed',
                description: error instanceof Error ? error.message : 'Failed to submit review',
                variant: 'destructive',
            });
        },
    });

    // Helper: Get quality label
    const getQualityLabel = (quality: number): string => {
        if (quality === 0) return 'Complete Blackout';
        if (quality === 1) return 'Incorrect';
        if (quality === 2) return 'Incorrect but familiar';
        if (quality === 3) return 'Correct with difficulty';
        if (quality === 4) return 'Correct with hesitation';
        return 'Perfect recall';
    };

    // Helper: Format next review date
    const formatNextReview = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins} minutes`;
        if (diffHours < 24) return `${diffHours} hours`;
        return `${diffDays} days`;
    };

    return {
        currentCard,
        currentIndex,
        totalCards: cards.length,
        submitReview,
        isPending,
        isComplete: currentIndex >= cards.length - 1,
    };
}
