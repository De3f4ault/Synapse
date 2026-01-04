/**
 * List Module - Public API
 * 
 * Handles deck discovery and management (grid/table views).
 * 
 * @exports
 * - Components: DeckCard, DeckGrid, DeckTable
 * - Hooks: useDecks, useDeck, useCreateDeck, useUpdateDeck, useDeleteDeck
 * - State: useDeckListStore, ViewMode, SortBy
 */

// Re-export core types needed by list consumers
export type { Deck } from '../core';

// Components
export * from './components';

// Hooks
export * from './hooks';

// State
export * from './state';
