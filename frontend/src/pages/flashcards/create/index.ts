/**
 * Create Module - Public API
 * 
 * Handles deck and card creation, including AI generation.
 * 
 * @exports
 * - Components: DeckCreator, FlashcardEditor
 * - Hooks: useFlashcardGenerator
 * - Engine: generateFlashcardsFromTopic, validation, constants
 */

// Re-export core types needed by create consumers
export type { Flashcard, FlashcardCreateInput, FlashcardUpdateInput } from '../core';

// Components
export * from './components';

// Hooks
export * from './hooks';

// Engine
export * from './engine';
