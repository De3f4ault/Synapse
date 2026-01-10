/**
 * navigateResults - Pure navigation logic
 *
 * No React, no DOM - just index math.
 */

import { SearchMatch } from './types';

/**
 * Get the next result index (wraps around).
 */
export function getNextIndex(matches: SearchMatch[], currentIndex: number): number {
    if (matches.length === 0) return -1;
    if (currentIndex < 0) return 0;
    return (currentIndex + 1) % matches.length;
}

/**
 * Get the previous result index (wraps around).
 */
export function getPrevIndex(matches: SearchMatch[], currentIndex: number): number {
    if (matches.length === 0) return -1;
    if (currentIndex <= 0) return matches.length - 1;
    return currentIndex - 1;
}

/**
 * Jump to a specific occurrence by global index.
 */
export function goToIndex(matches: SearchMatch[], targetIndex: number): number {
    if (matches.length === 0) return -1;
    if (targetIndex < 0) return 0;
    if (targetIndex >= matches.length) return matches.length - 1;
    return targetIndex;
}

/**
 * Find the index of the first match in a specific message.
 */
export function findFirstMatchInMessage(matches: SearchMatch[], messageId: string): number {
    return matches.findIndex((m) => m.messageId === messageId);
}

/**
 * Get all occurrence indices for a specific message.
 */
export function getOccurrenceIndicesForMessage(matches: SearchMatch[], messageId: string): number[] {
    return matches
        .map((m, i) => (m.messageId === messageId ? i : -1))
        .filter((i) => i !== -1);
}
