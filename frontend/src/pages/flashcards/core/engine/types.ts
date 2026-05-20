/**
 * Flashcards Core - Domain Types
 * 
 * Canonical type definitions for the flashcards system.
 * These types are SERVER-ALIGNED and match API responses.
 */

// ==================== CORE ENTITIES ====================

export interface Deck {
    id: number;
    name: string;
    description: string | null;
    card_count: number;
    due_count: number;  // Cards due for review (next_review <= now)
    created_at: string;
    updated_at: string;
    tags?: string[] | null;
    is_public?: boolean;
    user_id?: number;
    ai_generated?: boolean;
}

export interface Flashcard {
    id: number;
    deck_id: number;
    front_text: string;
    back_text: string;
    front_media_url?: string | null;
    back_media_url?: string | null;
    learning_state: LearningState;
    // SM-2 fields (server-authoritative)
    ease_factor?: number;
    interval?: number;
    repetitions?: number;
    next_review?: string | null;
    last_review?: string | null;
    accuracy?: number;
    times_reviewed?: number;
    created_at?: string;
    // Computed fields from get_due_cards()
    deck_name?: string | null;
    overdue_days?: number | null;
    priority_score?: number | null;
}

export type LearningState = 'new' | 'learning' | 'review' | 'mastered';

// ==================== REVIEW SYSTEM ====================

/**
 * Review quality rating (SM-2 compatible)
 * - 0: Again (complete failure)
 * - 1: Hard (significant difficulty)
 * - 2: Good (correct with some hesitation)
 * - 3: Easy (perfect recall)
 */
export type ReviewRating = 0 | 1 | 2 | 3;

export type ReviewQuality = 'again' | 'hard' | 'good' | 'easy';

export const RATING_TO_QUALITY: Record<ReviewRating, ReviewQuality> = {
    0: 'again',
    1: 'hard',
    2: 'good',
    3: 'easy',
};

export const QUALITY_TO_RATING: Record<ReviewQuality, ReviewRating> = {
    again: 0,
    hard: 1,
    good: 2,
    easy: 3,
};

/**
 * API-compatible quality values (maps 4-button UI to SM-2 0-5 scale)
 *
 * Mirrors: backend/app/sql/functions/flashcards/calculate_sm2.sql
 *   IF p_quality >= 3 THEN  -- correct
 *   ELSE                    -- incorrect (reset)
 */
export const RATING_TO_API_QUALITY: Record<ReviewRating, number> = {
    0: 0,  // Again  → SM-2 "complete blackout" (fail, reset)
    1: 3,  // Hard   → SM-2 "correct with serious difficulty" (pass, short interval)
    2: 4,  // Good   → SM-2 "correct after hesitation" (pass, normal interval)
    3: 5,  // Easy   → SM-2 "perfect response" (pass, long interval)
};

/**
 * SM-2 correct/incorrect threshold.
 * Mirrors: calculate_sm2.sql line 59 → `IF p_quality >= 3 THEN`
 *
 * Any mapped API quality >= this value is "correct recall."
 * Below this value = "failure" (card resets to interval 1).
 */
export const SM2_CORRECT_THRESHOLD = 3;

export interface ReviewProgress {
    cardId: number;
    rating: ReviewRating;
    timestamp: number;
    timeTakenMs: number;
}

export interface ReviewSubmission {
    quality: number; // API quality value (0, 3, 4, 5)
    time_taken_ms: number;
}

// ==================== SESSION STATE ====================

export interface StudySessionState {
    deckId: number | null;
    queue: Flashcard[];
    currentIndex: number;
    completed: ReviewProgress[];
    startedAt: number | null;
}

export interface StudySessionStats {
    totalReviewed: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    durationMs: number;
    /** Rating breakdown (mirrors SM-2 quality buckets) */
    ratingBreakdown: {
        again: number;   // 0 - complete failure
        hard: number;    // 1 - recalled with difficulty
        good: number;    // 2 - correct with hesitation
        easy: number;    // 3 - perfect recall
    };
    /** Average milliseconds spent per card */
    avgTimePerCardMs: number;
    /** Cards reviewed per minute */
    cardsPerMinute: number;
}

// ==================== FORM INPUTS ====================

export interface DeckCreateInput {
    name: string;
    description?: string | null;
    tags?: string[] | null;
    is_public?: boolean;
}

export interface DeckUpdateInput {
    name?: string;
    description?: string | null;
    tags?: string[] | null;
    is_public?: boolean;
}

export interface FlashcardCreateInput {
    deck_id: number;
    front_text: string;
    back_text: string;
    front_media_url?: string | null;
    back_media_url?: string | null;
}

export interface FlashcardUpdateInput {
    front_text?: string;
    back_text?: string;
    front_media_url?: string | null;
    back_media_url?: string | null;
}

// ==================== STATISTICS ====================

export interface DeckStats {
    totalCards: number;
    dueCards: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    masteredCards: number;
    masteryPercent: number;
    averageAccuracy: number;
    lastReviewDate?: string;
}

// ==================== SM-2 ENGINE ====================

export interface SM2Parameters {
    easeFactor: number;
    interval: number;
    repetitions: number;
}

export interface SM2Result extends SM2Parameters {
    nextReviewDate: Date;
}

// ==================== FILTERS & SORTING ====================

export type DeckSortBy = 'name' | 'created' | 'updated' | 'cards' | 'mastery';
export type SortOrder = 'asc' | 'desc';

export interface DeckFilters {
    searchQuery?: string;
    tags?: string[];
    isPublic?: boolean;
    sortBy?: DeckSortBy;
    sortOrder?: SortOrder;
}

export type CardSortBy = 'created' | 'next_review' | 'accuracy' | 'state';

export interface CardFilters {
    learningState?: LearningState[];
    sortBy?: CardSortBy;
    sortOrder?: SortOrder;
}
