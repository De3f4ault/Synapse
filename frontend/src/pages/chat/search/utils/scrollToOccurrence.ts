/**
 * Scroll to a specific search occurrence
 * 
 * Uses data attributes to locate the element:
 * - [data-message-id] on message containers
 * - [data-occurrence-id] on highlight marks
 */

import { SearchMatch } from '../engine/types';

/**
 * Flexible occurrence type for backward compatibility
 */
interface LegacyOccurrence {
    id?: string;
    messageId: number | string;
    startOffset?: number;
    start?: number;
}

type OccurrenceLike = SearchMatch | LegacyOccurrence;

/**
 * Scroll the viewport to show the current occurrence
 */
export function scrollToOccurrence(match: OccurrenceLike): void {
    const messageId = String(match.messageId);
    const start = 'start' in match ? match.start : match.startOffset;
    const occurrenceId = 'id' in match && match.id ? match.id : `${messageId}:${start}`;

    // First, try to find the specific highlight mark
    const highlightEl = document.querySelector(
        `[data-occurrence-id="${occurrenceId}"]`
    );

    if (highlightEl) {
        highlightEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
        });
        return;
    }

    // Fallback: scroll to the message container
    const messageEl = document.querySelector(
        `[data-message-id="${messageId}"]`
    );

    if (messageEl) {
        messageEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }
}

/**
 * Flash animation for current occurrence
 */
export function flashOccurrence(match: SearchMatch): void {
    const el = document.querySelector(
        `[data-occurrence-id="${match.messageId}:${match.start}"]`
    );

    if (el instanceof HTMLElement) {
        el.classList.add('search-flash');
        setTimeout(() => el.classList.remove('search-flash'), 300);
    }
}

/**
 * Scroll to a message by ID
 */
export function scrollToMessage(messageId: string): void {
    const messageEl = document.querySelector(
        `[data-message-id="${messageId}"]`
    );

    if (messageEl) {
        messageEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }
}
