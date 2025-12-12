import { useEffect, useState } from 'react';

/**
 * useNetworkStatus Hook
 *
 * Monitors online/offline network connectivity status.
 * Updates in real-time when connection changes.
 *
 * @returns Object containing:
 *   - isOnline: boolean - Current online status
 *   - isOffline: boolean - Current offline status (convenience)
 *
 * @example
 * const { isOnline, isOffline } = useNetworkStatus();
 *
 * if (isOffline) {
 *   return <Alert variant="warning">You are currently offline</Alert>;
 * }
 */

interface NetworkStatus {
    isOnline: boolean;
    isOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return true; // Assume online in SSR
        }
        return navigator.onLine;
    });

    useEffect(() => {
        // Skip if not in browser
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            setIsOnline(true);
            console.log('Network status: Online');
        };

        const handleOffline = () => {
            setIsOnline(false);
            console.log('Network status: Offline');
        };

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return {
        isOnline,
        isOffline: !isOnline,
    };
}

/**
 * useNetworkStatusWithCallback Hook
 *
 * Same as useNetworkStatus but with callbacks for status changes.
 * Useful for triggering side effects on connection changes.
 *
 * @param onOnline - Callback when connection is restored
 * @param onOffline - Callback when connection is lost
 *
 * @example
 * useNetworkStatusWithCallback(
 *   () => {
 *     toast.success('Connection restored');
 *     queryClient.refetchQueries();
 *   },
 *   () => {
 *     toast.error('Connection lost');
 *   }
 * );
 */
export function useNetworkStatusWithCallback(
    onOnline?: () => void,
                                             onOffline?: () => void
): NetworkStatus {
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return true;
        }
        return navigator.onLine;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            setIsOnline(true);
            onOnline?.();
        };

        const handleOffline = () => {
            setIsOnline(false);
            onOffline?.();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [onOnline, onOffline]);

    return {
        isOnline,
        isOffline: !isOnline,
    };
}
