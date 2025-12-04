import { useState, useEffect } from 'react';

/**
 * Debounce a value by a specified delay.
 * Useful for search inputs, auto-save, and rate-limiting API calls.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 500);
 *
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     searchApi(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up timeout to update debounced value after delay
        const timeoutId = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up timeout on value change or unmount
        return () => {
            clearTimeout(timeoutId);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounce a callback function.
 * Useful when you need to debounce a function rather than a value.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Object with the debounced function and cancel method
 *
 * @example
 * const { debouncedFn, cancel } = useDebouncedCallback(
 *   (value: string) => saveToApi(value),
 *   1000
 * );
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    delay: number = 500
): { debouncedFn: (...args: Parameters<T>) => void; cancel: () => void } {
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
    };

    const debouncedFn = (...args: Parameters<T>) => {
        cancel();
        const id = setTimeout(() => {
            callback(...args);
        }, delay);
        setTimeoutId(id);
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    return { debouncedFn, cancel };
}

export default useDebounce;
