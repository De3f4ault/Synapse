/**
 * Flashcard Store Selectors
 * 
 * Re-export selectors for external consumption.
 * Keeps selector logic co-located with store but exposes cleanly.
 */

export {
    selectActiveDeckId,
    selectError,
    selectHasActiveDeck,
} from './flashcardStore';
