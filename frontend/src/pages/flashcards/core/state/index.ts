/**
 * Flashcards Core State - Public API
 */

export { useFlashcardStore } from './flashcardStore';
export {
    selectActiveDeckId,
    selectError,
    selectHasActiveDeck,
} from './flashcardSelectors';
