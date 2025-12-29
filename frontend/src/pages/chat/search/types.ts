/**
 * Search Types - Shared across module
 *
 * This file bridges the old component types with the new engine types.
 * Components import from here for backward compatibility.
 */

// Re-export engine types
export type { SearchMatch, SearchIndex } from './engine/types';
export { DEFAULT_SEARCH_OPTIONS } from './engine/types';

// Legacy types for existing components (backward compatible)
export interface ContentBlock {
    type: 'text' | 'code' | 'quote' | 'heading' | 'list';
    content: string;
    blockIndex: number;
    startOffset: number;
    endOffset: number;
    language?: string;
}

export interface SearchOccurrence {
    /** Stable ID: `${messageId}:${blockIndex}:${startOffset}` */
    id: string;

    /** Message reference */
    messageId: number;
    messageIndex: number;
    role: 'user' | 'assistant';

    /** Block information */
    blockType: ContentBlock['type'];
    blockIndex: number;

    /** Offsets relative to block.content */
    startOffset: number;
    endOffset: number;

    /** The actual matched text */
    matchText: string;

    /** Match type for visual distinction */
    matchType: 'literal' | 'fuzzy';

    /** Global index across all occurrences */
    globalIndex: number;
}

export interface SearchState {
    query: string;
    options: SearchOptions;
    occurrences: SearchOccurrence[];
    totalCount: number;
    currentIndex: number;
    isSearching: boolean;
    isFrozen: boolean;
}

// Re-export SearchOptions from engine
import type { SearchOptions as EngineSearchOptions } from './engine/types';
export type SearchOptions = EngineSearchOptions & {
    fuzzyEnabled?: boolean;
    regexEnabled?: boolean;
};

export const INITIAL_SEARCH_STATE: SearchState = {
    query: '',
    options: {
        caseSensitive: false,
        wholeWord: false,
        fuzzyEnabled: false,
        regexEnabled: false,
    },
    occurrences: [],
    totalCount: 0,
    currentIndex: -1,
    isSearching: false,
    isFrozen: false,
};
