/**
 * searchIndex - Execute search query against index
 *
 * PURE FUNCTION: No React, no DOM, no side-effects.
 * Deterministic: same input = same output.
 */

import { SearchIndex, SearchMatch, SearchOptions, DEFAULT_SEARCH_OPTIONS } from './types';

/**
 * Search the index for a query string.
 * Returns all matches with positions and scores.
 */
export function searchIndex(
    index: SearchIndex,
    query: string,
    options: SearchOptions = DEFAULT_SEARCH_OPTIONS
): SearchMatch[] {
    if (!query || query.length < 2) return [];

    const results: SearchMatch[] = [];
    const searchQuery = options.caseSensitive ? query : query.toLowerCase();

    for (let blockIndex = 0; blockIndex < index.blocks.length; blockIndex++) {
        const block = index.blocks[blockIndex];
        if (!block) continue; // Guard against undefined
        const text = options.caseSensitive ? block.text : block.text.toLowerCase();

        let pos = 0;
        while ((pos = text.indexOf(searchQuery, pos)) !== -1) {
            // Whole word check
            if (options.wholeWord) {
                const before = pos > 0 ? text[pos - 1] : ' ';
                const after = pos + searchQuery.length < text.length ? text[pos + searchQuery.length] : ' ';
                const wordBoundary = /[\s\p{P}]/u;

                if (!before || !after || !wordBoundary.test(before) || !wordBoundary.test(after)) {
                    pos += 1;
                    continue;
                }
            }

            results.push({
                messageId: block.messageId,
                blockIndex,
                start: pos,
                end: pos + query.length,
                matchText: block.text.slice(pos, pos + query.length),
                score: calculateScore(block, pos, query),
            });

            pos += 1; // Move forward to find next occurrence
        }
    }

    // Sort by score (descending), then by position (ascending)
    return results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.messageId !== b.messageId) return a.messageId.localeCompare(b.messageId);
        return a.start - b.start;
    });
}

/**
 * Calculate match score based on context.
 * Higher scores for more relevant matches.
 */
function calculateScore(block: { role: string; text: string }, position: number, query: string): number {
    let score = 1.0;

    // Boost for matches at word boundaries
    const charBefore = position > 0 ? block.text[position - 1] : undefined;
    if (position === 0 || (charBefore && /\s/.test(charBefore))) {
        score += 0.5;
    }

    // Boost for user messages (often more relevant for search)
    if (block.role === 'user') {
        score += 0.3;
    }

    // Boost for matches near start of block
    if (position < 100) {
        score += 0.2;
    }

    // Boost for exact case match
    if (block.text.slice(position, position + query.length) === query) {
        score += 0.2;
    }

    return score;
}

/**
 * Get unique message IDs that have matches.
 * Useful for highlighting which messages contain results.
 */
export function getMatchedMessageIds(matches: SearchMatch[]): Set<string> {
    return new Set(matches.map((m) => m.messageId));
}

/**
 * Group matches by message ID.
 */
export function groupMatchesByMessage(matches: SearchMatch[]): Map<string, SearchMatch[]> {
    const grouped = new Map<string, SearchMatch[]>();

    for (const match of matches) {
        const existing = grouped.get(match.messageId) || [];
        existing.push(match);
        grouped.set(match.messageId, existing);
    }

    return grouped;
}
