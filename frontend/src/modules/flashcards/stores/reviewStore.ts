import { create } from 'zustand';
import type { FlashcardResponse } from '@/api/generated';

/**
 * Review session state store (Zustand)
 * Manages transient UI state during flashcard review
 */

interface ReviewState {
    // Current session data
    cards: FlashcardResponse[];
    currentIndex: number;
    isFlipped: boolean;
    sessionStartTime: number | null;
    cardStartTime: number | null;

    // Session statistics
    reviewedCount: number;
    correctCount: number;

    // Actions
    startSession: (cards: FlashcardResponse[]) => void;
    nextCard: () => void;
    flipCard: () => void;
    resetSession: () => void;
    recordReview: (quality: number) => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
    // Initial state
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    sessionStartTime: null,
    cardStartTime: null,
    reviewedCount: 0,
    correctCount: 0,

    // Start a new review session
    startSession: (cards) => set({
        cards,
        currentIndex: 0,
        isFlipped: false,
        sessionStartTime: Date.now(),
                                 cardStartTime: Date.now(),
                                 reviewedCount: 0,
                                 correctCount: 0,
    }),

    // Move to next card
    nextCard: () => {
        const state = get();
        if (state.currentIndex < state.cards.length - 1) {
            set({
                currentIndex: state.currentIndex + 1,
                isFlipped: false,
                cardStartTime: Date.now(),
            });
        }
    },

    // Flip current card
    flipCard: () => set((state) => ({
        isFlipped: !state.isFlipped,
    })),

    // Reset session
    resetSession: () => set({
        cards: [],
        currentIndex: 0,
        isFlipped: false,
        sessionStartTime: null,
        cardStartTime: null,
        reviewedCount: 0,
        correctCount: 0,
    }),

    // Record review result
    recordReview: (quality) => {
        const state = get();
        set({
            reviewedCount: state.reviewedCount + 1,
            correctCount: state.correctCount + (quality >= 3 ? 1 : 0),
        });
    },
}));
