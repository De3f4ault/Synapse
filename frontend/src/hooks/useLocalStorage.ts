import { useState, useEffect, useCallback } from 'react';

/**
 * Sync state with localStorage.
 * Persists state across browser sessions with automatic serialization.
 *
 * @param key - The localStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns Tuple of [storedValue, setValue, removeValue]
 *
 * @example
 * const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // Get initial value from localStorage or use provided initial value
    const readValue = useCallback((): T => {
        if (typeof window === 'undefined') {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    }, [key, initialValue]);

    const [storedValue, setStoredValue] = useState<T>(readValue);

    // Update localStorage when state changes
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                // Allow value to be a function for same API as useState
                const valueToStore = value instanceof Function ? value(storedValue) : value;

                setStoredValue(valueToStore);

                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));

                    // Dispatch custom event for cross-tab synchronization
                    window.dispatchEvent(
                        new StorageEvent('storage', {
                            key,
                            newValue: JSON.stringify(valueToStore),
                        })
                    );
                }
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, storedValue]
    );

    // Remove value from localStorage
    const removeValue = useCallback(() => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
                setStoredValue(initialValue);

                window.dispatchEvent(
                    new StorageEvent('storage', {
                        key,
                        newValue: null,
                    })
                );
            }
        } catch (error) {
            console.warn(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    // Listen for changes from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === key && event.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(event.newValue) as T);
                } catch {
                    setStoredValue(event.newValue as unknown as T);
                }
            } else if (event.key === key && event.newValue === null) {
                setStoredValue(initialValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key, initialValue]);

    // Re-read value on mount in case it changed
    useEffect(() => {
        setStoredValue(readValue());
    }, [readValue]);

    return [storedValue, setValue, removeValue];
}

/**
 * Type-safe localStorage keys used in the application.
 * Extend this as needed for new storage keys.
 */
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'synapse_auth_token',
    REFRESH_TOKEN: 'synapse_refresh_token',
    THEME: 'synapse_theme',
    SIDEBAR_COLLAPSED: 'synapse_sidebar_collapsed',
    LAST_DECK_ID: 'synapse_last_deck_id',
    REVIEW_SETTINGS: 'synapse_review_settings',
    EDITOR_PREFERENCES: 'synapse_editor_preferences',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export default useLocalStorage;
