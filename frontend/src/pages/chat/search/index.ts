/**
 * Search Module - Public API
 *
 * This is the ONLY entry point for the search module.
 * No deep imports across modules allowed.
 */

// Components
export { SearchBar, SearchResultsPanel, HighlightedText, JumpToDropdown, NoResultsRecovery, SearchHeatmap } from './components';

// Hooks
export { useConversationSearch, useRecentSearches } from './hooks';

// State (selectors only - store internals are private)
export { useSearchStore } from './state/searchStore';
export {
    useSearchQuery,
    useSearchResults,
    useSearchResultCount,
    useActiveSearchResult,
    useActiveResultIndex,
    useIsSearchOpen,
    useIsSearching,
    useSearchActions,
    useMessageHasMatches,
    useMatchesForMessage,
} from './state/searchSelectors';

// Utils
export { scrollToOccurrence, flashOccurrence, scrollToMessage } from './utils';

// Engine types (for external typing only)
export type { SearchMatch, SearchIndex, SearchOptions } from './engine/types';
