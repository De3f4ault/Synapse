/**
 * useConversationSearch - Thin Adapter Hook
 *
 * INVARIANT:
 * This hook DOES NOT own state. It wires:
 * - Engine functions (pure logic)
 * - State store (authority)
 * - Side effects (scrolling)
 *
 * Components use this hook. They don't touch engine/state directly.
 */

import { useCallback, useEffect, useRef } from 'react';
import { ChatMessageResponse } from '@/api/generated';
import { buildIndex, searchIndex } from '../engine';
import { useSearchStore } from '../state/searchStore';
import {
    useSearchQuery,
    useSearchResults,
    useActiveSearchResult,
    useSearchResultCount,
    useActiveResultIndex,
} from '../state/searchSelectors';

interface UseConversationSearchProps {
    messages: ChatMessageResponse[];
}

export function useConversationSearch({ messages }: UseConversationSearchProps) {
    const store = useSearchStore();
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    // Subscriptions (fine-grained)
    const query = useSearchQuery();
    const results = useSearchResults();
    const activeResult = useActiveSearchResult();
    const resultCount = useSearchResultCount();
    const activeIndex = useActiveResultIndex();

    /**
     * Run search - delegates to engine + updates store
     */
    const runSearch = useCallback(
        (newQuery: string) => {
            store.setQuery(newQuery);

            if (!newQuery || newQuery.length < 2) {
                store.clearResults();
                return;
            }

            store.setIsSearching(true);

            // Build index from current messages
            const index = buildIndex(
                messagesRef.current.map((m) => ({
                    id: m.id,
                    content: m.content || '',
                    role: m.role,
                }))
            );
            store.setIndex(index);

            // Execute search
            const matches = searchIndex(index, newQuery, store.options);
            store.setResults(matches);
        },
        [store]
    );

    /**
     * Re-run search when messages change (but keep current query)
     */
    useEffect(() => {
        if (query && query.length >= 2) {
            runSearch(query);
        }
        // Only re-run when messages change, not on query change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    /**
     * Navigation
     */
    const goToNext = useCallback(() => {
        store.nextResult();
    }, [store]);

    const goToPrev = useCallback(() => {
        store.prevResult();
    }, [store]);

    const goToIndex = useCallback(
        (index: number) => {
            store.setActiveResultIndex(index);
        },
        [store]
    );

    /**
     * Clear search
     */
    const clearSearch = useCallback(() => {
        store.reset();
    }, [store]);

    /**
     * Toggle search panel
     */
    const toggleSearch = useCallback(() => {
        store.setIsOpen(!store.isOpen);
    }, [store]);

    const openSearch = useCallback(() => {
        store.setIsOpen(true);
    }, [store]);

    const closeSearch = useCallback(() => {
        store.setIsOpen(false);
        store.reset();
    }, [store]);

    /**
     * Check if a message has matches
     */
    const isMessageHighlighted = useCallback(
        (messageId: number) => {
            return results.some((r) => r.messageId === String(messageId));
        },
        [results]
    );

    /**
     * Get matches for a specific message
     */
    const getMatchesForMessage = useCallback(
        (messageId: number) => {
            return results.filter((r) => r.messageId === String(messageId));
        },
        [results]
    );

    /**
     * Get active occurrence (for scrolling)
     */
    const getActiveOccurrence = useCallback(() => {
        return activeResult;
    }, [activeResult]);

    /**
     * Set search options
     */
    const setOptions = useCallback(
        (options: { caseSensitive?: boolean; wholeWord?: boolean }) => {
            store.setOptions(options);
            // Re-run search with new options
            if (query && query.length >= 2) {
                runSearch(query);
            }
        },
        [store, query, runSearch]
    );

    // Build backward-compatible state object for legacy components
    const state = {
        query,
        options: store.options,
        occurrences: results.map((r, idx) => ({
            id: `${r.messageId}:${r.blockIndex}:${r.start}`,
            messageId: parseInt(r.messageId),
            messageIndex: idx,
            role: 'assistant' as const,
            blockType: 'text' as const,
            blockIndex: r.blockIndex,
            startOffset: r.start,
            endOffset: r.end,
            matchText: r.matchText,
            matchType: 'literal' as const,
            globalIndex: idx,
        })),
        totalCount: resultCount,
        currentIndex: activeIndex,
        isSearching: store.isSearching,
        isFrozen: false,
    };

    return {
        // State (read-only projections)
        query,
        results,
        activeResult,
        resultCount,
        activeIndex,
        isOpen: store.isOpen,
        isSearching: store.isSearching,

        // Backward-compatible state object
        state,

        // Actions
        runSearch,
        setQuery: runSearch, // Alias for backward compatibility
        setOptions,
        goToNext,
        goToPrev,
        goToIndex,
        goToOccurrence: goToIndex, // Alias for backward compatibility
        clearSearch,
        toggleSearch,
        openSearch,
        closeSearch,

        // Utilities
        isMessageHighlighted,
        getMatchesForMessage,
        getActiveOccurrence,
    };
}

export default useConversationSearch;
