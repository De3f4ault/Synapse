/**
 * Study Session Store
 * 
 * Manages ephemeral study session state.
 * This state is NEVER persisted - it lives only for the session duration.
 * 
 * @architecture
 * - Queue: Cards to review (ordered by priority)
 * - Progress: Completed reviews (synced to server)
 * - Session boundaries: resetForDeck(), endSession()
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Flashcard, ReviewRating, ReviewProgress, StudySessionStats } from '../../core';
import { RATING_TO_API_QUALITY, SM2_CORRECT_THRESHOLD } from '../../core';

// ==================== TYPES ====================

interface StudyStoreState {
    // Session identity
    deckId: number | null;

    // Card queue
    queue: Flashcard[];
    currentIndex: number;

    // Card interaction state
    isFlipped: boolean;
    cardStartTime: number | null;

    // Completed reviews (pending sync)
    completed: ReviewProgress[];

    // Session timing
    sessionStartTime: number | null;

    // Error state
    studyError: string | null;
}

interface StudyStoreActions {
    // Session lifecycle
    startSession: (deckId: number, cards: Flashcard[]) => void;
    resetForDeck: (deckId: number) => void;
    endSession: () => StudySessionStats | null;

    // Card navigation
    nextCard: () => boolean; // Returns false if no more cards
    flipCard: () => void;

    // Review recording
    recordReview: (rating: ReviewRating) => ReviewProgress | null;

    // Error management
    setStudyError: (error: string | null) => void;
    clearStudyError: () => void;

    // Getters (for computed values)
    getCurrentCard: () => Flashcard | null;
    getSessionStats: () => StudySessionStats;
    isSessionComplete: () => boolean;
}

type StudyStore = StudyStoreState & StudyStoreActions;

// ==================== INITIAL STATE ====================

const initialState: StudyStoreState = {
    deckId: null,
    queue: [],
    currentIndex: 0,
    isFlipped: false,
    cardStartTime: null,
    completed: [],
    sessionStartTime: null,
    studyError: null,
};

// ==================== STORE ====================

export const useStudyStore = create<StudyStore>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,

        // Start a new study session
        startSession: (deckId, cards) => {
            set({
                deckId,
                queue: cards,
                currentIndex: 0,
                isFlipped: false,
                cardStartTime: Date.now(),
                completed: [],
                sessionStartTime: Date.now(),
                studyError: null,
            });
        },

        // Reset for a new deck (clears all session state)
        resetForDeck: (deckId) => {
            set({
                ...initialState,
                deckId,
            });
        },

        // End the session and return stats
        endSession: () => {
            const state = get();
            const stats = state.getSessionStats();

            // Reset to initial state
            set(initialState);

            return stats;
        },

        // Move to the next card
        nextCard: () => {
            const state = get();
            const nextIndex = state.currentIndex + 1;

            if (nextIndex >= state.queue.length) {
                return false; // No more cards
            }

            set({
                currentIndex: nextIndex,
                isFlipped: false,
                cardStartTime: Date.now(),
            });

            return true;
        },

        // Flip the current card
        flipCard: () => {
            set((state) => ({ isFlipped: !state.isFlipped }));
        },

        // Record a review result
        recordReview: (rating) => {
            const state = get();
            const currentCard = state.getCurrentCard();

            if (!currentCard) {
                return null;
            }

            const timeTakenMs = state.cardStartTime
                ? Date.now() - state.cardStartTime
                : 0;

            const progress: ReviewProgress = {
                cardId: currentCard.id,
                rating,
                timestamp: Date.now(),
                timeTakenMs,
            };

            set((state) => ({
                completed: [...state.completed, progress],
            }));

            return progress;
        },

        // Error management
        setStudyError: (error) => set({ studyError: error }),
        clearStudyError: () => set({ studyError: null }),

        // Get current card
        getCurrentCard: () => {
            const { queue, currentIndex } = get();
            if (currentIndex < 0 || currentIndex >= queue.length) return null;
            return queue[currentIndex] ?? null;
        },

        // Get session statistics
        getSessionStats: () => {
            const state = get();
            const totalReviewed = state.completed.length;

            // Mirror backend: calculate_sm2.sql → IF p_quality >= 3 THEN (correct)
            const correct = state.completed.filter(
                (r) => RATING_TO_API_QUALITY[r.rating] >= SM2_CORRECT_THRESHOLD
            ).length;
            const incorrect = totalReviewed - correct;
            const accuracy = totalReviewed > 0 ? correct / totalReviewed : 0;

            const durationMs = state.sessionStartTime
                ? Date.now() - state.sessionStartTime
                : 0;

            // Rating breakdown — count each button press
            const ratingBreakdown = {
                again: state.completed.filter((r) => r.rating === 0).length,
                hard:  state.completed.filter((r) => r.rating === 1).length,
                good:  state.completed.filter((r) => r.rating === 2).length,
                easy:  state.completed.filter((r) => r.rating === 3).length,
            };

            // Average time per card (from per-card timeTakenMs captured at review)
            const totalTimeMs = state.completed.reduce((sum, r) => sum + r.timeTakenMs, 0);
            const avgTimePerCardMs = totalReviewed > 0 ? totalTimeMs / totalReviewed : 0;

            // Pace: cards per minute (based on wall-clock session duration)
            const durationMinutes = durationMs / 60_000;
            const cardsPerMinute = durationMinutes > 0 ? totalReviewed / durationMinutes : 0;

            return {
                totalReviewed,
                correct,
                incorrect,
                accuracy,
                durationMs,
                ratingBreakdown,
                avgTimePerCardMs,
                cardsPerMinute,
            };
        },

        // Check if session is complete (all cards reviewed)
        isSessionComplete: () => {
            const state = get();
            return state.queue.length > 0 && state.completed.length >= state.queue.length;
        },
    }))
);

// ==================== SELECTORS ====================

export const selectCurrentCard = (state: StudyStore) => state.getCurrentCard();
export const selectIsFlipped = (state: StudyStore) => state.isFlipped;
export const selectProgress = (state: StudyStore) => ({
    current: state.currentIndex + 1,
    total: state.queue.length,
    completed: state.completed.length,
});
export const selectStudyError = (state: StudyStore) => state.studyError;
export const selectIsSessionActive = (state: StudyStore) => state.sessionStartTime !== null;
