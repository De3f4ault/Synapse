/**
 * Search Selectors - Derived State
 *
 * Fine-grained subscriptions for optimal re-renders.
 * Components subscribe to exactly what they need.
 */

import { useSearchStore } from './searchStore';

// Query state
export const useSearchQuery = () => useSearchStore((s) => s.query);
export const useSearchOptions = () => useSearchStore((s) => s.options);

// Results
export const useSearchResults = () => useSearchStore((s) => s.results);
export const useSearchResultCount = () => useSearchStore((s) => s.results.length);
export const useActiveResultIndex = () => useSearchStore((s) => s.activeResultIndex);

// Active result
export const useActiveSearchResult = () =>
    useSearchStore((s) => (s.activeResultIndex >= 0 ? s.results[s.activeResultIndex] : null));

// UI state
export const useIsSearchOpen = () => useSearchStore((s) => s.isOpen);
export const useIsSearching = () => useSearchStore((s) => s.isSearching);

// Actions (stable references)
export const useSearchActions = () =>
    useSearchStore((s) => ({
        setQuery: s.setQuery,
        setOptions: s.setOptions,
        setResults: s.setResults,
        nextResult: s.nextResult,
        prevResult: s.prevResult,
        reset: s.reset,
        setIsOpen: s.setIsOpen,
    }));

// Check if a message has matches
export const useMessageHasMatches = (messageId: string) =>
    useSearchStore((s) => s.results.some((r) => r.messageId === messageId));

// Get matches for a specific message
export const useMatchesForMessage = (messageId: string) =>
    useSearchStore((s) => s.results.filter((r) => r.messageId === messageId));
