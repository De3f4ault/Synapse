/**
 * Flashcards Core Module - Public API
 * 
 * This is the canonical authority for flashcard domain logic.
 * 
 * @exports
 * - Types: Deck, Flashcard, ReviewRating, SM2Parameters, etc.
 * - Engine: calculateNextReview, sortByPriority, etc.
 * - State: useFlashcardStore, selectors
 * - Hooks: useActiveDeck
 */

// Engine (types + scheduling)
export * from './engine';

// State (store + selectors)
export * from './state';

// Hooks
export * from './hooks';
