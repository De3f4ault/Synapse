/**
 * useRecentSearches - Persist and retrieve recent search queries
 * 
 * Uses localStorage for persistence across sessions.
 * Limited to MAX_RECENT queries to prevent bloat.
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'synapse_recent_searches';
const MAX_RECENT = 5;

interface UseRecentSearchesReturn {
    recentSearches: string[];
    addSearch: (query: string) => void;
    clearSearches: () => void;
    removeSearch: (query: string) => void;
}

export function useRecentSearches(): UseRecentSearchesReturn {
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Sync to localStorage whenever recentSearches changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
        } catch {
            // localStorage might be full or disabled
        }
    }, [recentSearches]);

    const addSearch = useCallback((query: string) => {
        const trimmed = query.trim();
        if (trimmed.length < 2) return;

        setRecentSearches((prev) => {
            // Remove duplicates, add to front, limit to MAX_RECENT
            const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
            return [trimmed, ...filtered].slice(0, MAX_RECENT);
        });
    }, []);

    const removeSearch = useCallback((query: string) => {
        setRecentSearches((prev) => prev.filter((q) => q !== query));
    }, []);

    const clearSearches = useCallback(() => {
        setRecentSearches([]);
    }, []);

    return {
        recentSearches,
        addSearch,
        clearSearches,
        removeSearch,
    };
}

export default useRecentSearches;
