import { useEffect, useRef } from 'react';

/**
 * useAnnounce Hook
 *
 * Provides screen reader announcements using ARIA live regions.
 * Useful for dynamic content updates that need to be announced to screen reader users.
 *
 * @example
 * const announce = useAnnounce();
 *
 * // Polite announcement (waits for user to finish)
 * announce('Form saved successfully');
 *
 * // Assertive announcement (interrupts immediately)
 * announce('Error: Please fix validation errors', 'assertive');
 */

type AriaLive = 'polite' | 'assertive' | 'off';

interface AnnounceOptions {
    politeness?: AriaLive;
    clearDelay?: number; // Time in ms before clearing the announcement
}

export function useAnnounce() {
    const liveRegionRef = useRef<HTMLDivElement | null>(null);

    // Create live region on mount
    useEffect(() => {
        if (typeof document === 'undefined') return;

        // Check if live region already exists
        let liveRegion = document.getElementById('aria-live-region') as HTMLDivElement;

        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-region';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');

            // Hide visually but keep accessible to screen readers
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';

            document.body.appendChild(liveRegion);
        }

        liveRegionRef.current = liveRegion;

        return () => {
            // Don't remove on unmount as other components might be using it
            // Only clear the content
            if (liveRegionRef.current) {
                liveRegionRef.current.textContent = '';
            }
        };
    }, []);

    /**
     * Announce a message to screen readers
     *
     * @param message - The message to announce
     * @param options - Announcement options (politeness level, clear delay)
     */
    const announce = (
        message: string,
        options: AnnounceOptions = {}
    ) => {
        const { politeness = 'polite', clearDelay = 3000 } = options;

        if (!liveRegionRef.current) return;

        const liveRegion = liveRegionRef.current;

        // Update politeness level
        liveRegion.setAttribute('aria-live', politeness);

        // Clear previous message
        liveRegion.textContent = '';

        // Use setTimeout to ensure screen readers detect the change
        setTimeout(() => {
            if (liveRegion) {
                liveRegion.textContent = message;
            }

            // Clear message after delay
            if (clearDelay > 0) {
                setTimeout(() => {
                    if (liveRegion) {
                        liveRegion.textContent = '';
                    }
                }, clearDelay);
            }
        }, 100);
    };

    return announce;
}

/**
 * Announce Polite (default)
 * Waits for user to finish current action before announcing
 */
export function announcePolite(message: string) {
    const liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) return;

    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.textContent = message;

    setTimeout(() => {
        liveRegion.textContent = '';
    }, 3000);
}

/**
 * Announce Assertive
 * Interrupts user immediately with the announcement
 */
export function announceAssertive(message: string) {
    const liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) return;

    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.textContent = message;

    setTimeout(() => {
        liveRegion.textContent = '';
    }, 3000);
}
