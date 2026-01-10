/**
 * Search Engine Types
 *
 * INVARIANT:
 * These types are the contract between engine, state, and UI.
 * No React dependencies. No DOM. Pure data structures.
 */

export interface MessageBlock {
    messageId: string;
    text: string;
    role: 'user' | 'assistant';
    offsetStart: number;
    offsetEnd: number;
}

export interface SearchMatch {
    messageId: string;
    blockIndex: number;
    start: number;
    end: number;
    matchText: string;
    score: number;
}

export interface SearchIndex {
    blocks: MessageBlock[];
    version: number; // Incremented on rebuild
}

export interface SearchOptions {
    caseSensitive: boolean;
    wholeWord: boolean;
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
    caseSensitive: false,
    wholeWord: false,
};
