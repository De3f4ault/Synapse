/**
 * Flashcard Core Store
 * 
 * Manages active deck identity and session boundaries.
 * This is the canonical authority for "which deck are we working with".
 * 
 * @architecture
 * - activeDeckId: URL-derived or explicitly set
 * - Session boundary methods enforce state reset on deck switch
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ==================== TYPES ====================

interface FlashcardStoreState {
    // Active deck identity
    activeDeckId: number | null;

    // Error state (if any core operation fails)
    error: string | null;
}

interface FlashcardStoreActions {
    // Set active deck (triggers session reset in study store via subscription)
    setActiveDeck: (deckId: number | null) => void;

    // Error management
    setError: (error: string | null) => void;
    clearError: () => void;

    // Session boundary
    resetForDeck: (deckId: number) => void;
}

type FlashcardStore = FlashcardStoreState & FlashcardStoreActions;

// ==================== STORE ====================

export const useFlashcardStore = create<FlashcardStore>()(
    subscribeWithSelector((set) => ({
        // Initial state
        activeDeckId: null,
        error: null,

        // Set active deck
        setActiveDeck: (deckId) => {
            set({ activeDeckId: deckId, error: null });
        },

        // Error management
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Reset for a specific deck (called when switching decks)
        resetForDeck: (deckId) => {
            set({ activeDeckId: deckId, error: null });
        },
    }))
);

// ==================== SELECTORS ====================

export const selectActiveDeckId = (state: FlashcardStore) => state.activeDeckId;
export const selectError = (state: FlashcardStore) => state.error;
export const selectHasActiveDeck = (state: FlashcardStore) => state.activeDeckId !== null;
