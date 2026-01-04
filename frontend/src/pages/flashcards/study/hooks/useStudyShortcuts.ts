/**
 * useStudyShortcuts Hook
 * 
 * Keyboard shortcuts for the study session.
 * Registered at the study module level, not individual components.
 * 
 * @bindings
 * - Space: Reveal answer
 * - 1: Rate Again (0)
 * - 2: Rate Hard (1)
 * - 3: Rate Good (2)
 * - 4: Rate Easy (3)
 * - Escape: End session
 */

import { useEffect, useCallback } from 'react';
import type { ReviewRating } from '../../core';

interface UseStudyShortcutsOptions {
    /** Whether shortcuts are enabled */
    enabled: boolean;
    /** Whether card is currently flipped (answer visible) */
    isFlipped: boolean;
    /** Flip the card */
    onFlip: () => void;
    /** Submit a rating */
    onRate: (rating: ReviewRating) => void;
    /** End the session */
    onEndSession: () => void;
}

const RATING_KEYS: Record<string, ReviewRating> = {
    '1': 0, // Again
    '2': 1, // Hard
    '3': 2, // Good
    '4': 3, // Easy
};

export function useStudyShortcuts({
    enabled,
    isFlipped,
    onFlip,
    onRate,
    onEndSession,
}: UseStudyShortcutsOptions): void {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Ignore if user is typing in an input
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const key = event.key;

            // Space: Flip card
            if (key === ' ' || key === 'Space') {
                event.preventDefault();
                if (!isFlipped) {
                    onFlip();
                }
                return;
            }

            // 1-4: Rating (only when flipped)
            const rating = RATING_KEYS[key];
            if (rating !== undefined && isFlipped) {
                event.preventDefault();
                onRate(rating);
                return;
            }

            // Escape: End session
            if (key === 'Escape') {
                event.preventDefault();
                onEndSession();
                return;
            }
        },
        [enabled, isFlipped, onFlip, onRate, onEndSession]
    );

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, handleKeyDown]);
}
