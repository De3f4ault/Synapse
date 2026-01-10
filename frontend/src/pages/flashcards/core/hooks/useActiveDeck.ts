/**
 * useActiveDeck Hook
 * 
 * Provides access to the currently active deck with automatic
 * session boundary management.
 */

import { useEffect } from 'react';
import { useFlashcardStore } from '../state';

interface UseActiveDeckOptions {
    /**
     * Deck ID to set as active. If provided, will update the store.
     */
    deckId?: number;
}

interface UseActiveDeckResult {
    activeDeckId: number | null;
    setActiveDeck: (deckId: number | null) => void;
    error: string | null;
    clearError: () => void;
}

/**
 * Hook for managing the active deck.
 * 
 * When deckId is provided (e.g., from URL params), it automatically
 * updates the store if different from current.
 * 
 * @example
 * // In a page component with URL param
 * const { id } = useParams<{ id: string }>();
 * const { activeDeckId } = useActiveDeck({ deckId: Number(id) });
 * 
 * @example
 * // Just reading the active deck
 * const { activeDeckId, setActiveDeck } = useActiveDeck();
 */
export function useActiveDeck(options?: UseActiveDeckOptions): UseActiveDeckResult {
    const activeDeckId = useFlashcardStore((state) => state.activeDeckId);
    const setActiveDeck = useFlashcardStore((state) => state.setActiveDeck);
    const resetForDeck = useFlashcardStore((state) => state.resetForDeck);
    const error = useFlashcardStore((state) => state.error);
    const clearError = useFlashcardStore((state) => state.clearError);

    // Sync deckId option with store
    useEffect(() => {
        if (options?.deckId !== undefined && options.deckId !== activeDeckId) {
            resetForDeck(options.deckId);
        }
    }, [options?.deckId, activeDeckId, resetForDeck]);

    return {
        activeDeckId,
        setActiveDeck,
        error,
        clearError,
    };
}
