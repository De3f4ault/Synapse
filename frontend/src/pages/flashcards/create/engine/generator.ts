/**
 * Flashcard Generator Engine
 * 
 * Framework-agnostic AI generation logic.
 * Separated from React hooks for testability and reuse.
 */

import { getAuthToken } from '@/api/client';

// ==================== TYPES ====================

export type GeneratorDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratorRequest {
    topic: string;
    deckName?: string;
    numCards?: number;
    difficulty?: GeneratorDifficulty;
    tags?: string[];
}

export interface GeneratorResponse {
    deck_id: number;
    deck_name: string;
    cards_generated: number;
    status: string;
    message: string;
}

export interface GeneratorError {
    message: string;
    code?: string;
}

// ==================== API CALL ====================

/**
 * Generate flashcards from a topic using AI.
 * 
 * This is a pure async function - no React state.
 * Hook wrappers can add caching, optimistic updates, etc.
 */
export async function generateFlashcardsFromTopic(
    request: GeneratorRequest
): Promise<GeneratorResponse> {
    const token = getAuthToken();

    const response = await fetch('/api/v1/decks/generate-from-topic', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
            topic: request.topic,
            deck_name: request.deckName,
            num_cards: request.numCards ?? 10,
            difficulty: request.difficulty ?? 'medium',
            tags: request.tags,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate flashcards');
    }

    return response.json();
}

// ==================== VALIDATION ====================

export function validateGeneratorRequest(request: GeneratorRequest): GeneratorError | null {
    if (!request.topic || request.topic.trim().length === 0) {
        return { message: 'Topic is required', code: 'TOPIC_REQUIRED' };
    }

    if (request.topic.length < 3) {
        return { message: 'Topic must be at least 3 characters', code: 'TOPIC_TOO_SHORT' };
    }

    if (request.numCards !== undefined) {
        if (request.numCards < 5 || request.numCards > 50) {
            return { message: 'Number of cards must be between 5 and 50', code: 'INVALID_NUM_CARDS' };
        }
    }

    return null;
}

// ==================== DEFAULTS ====================

export const DEFAULT_NUM_CARDS = 10;
export const DEFAULT_DIFFICULTY: GeneratorDifficulty = 'medium';
export const MIN_CARDS = 5;
export const MAX_CARDS = 50;
