/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * Framework-agnostic implementation of the SM-2 algorithm.
 * This is pure domain logic with no React/Zustand dependencies.
 * 
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import type { SM2Parameters, SM2Result, ReviewRating, Flashcard } from './types';

// ==================== CONSTANTS ====================

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const EASE_BONUS = 0.1;
const EASE_PENALTY = 0.2;

// ==================== CORE ALGORITHM ====================

/**
 * Calculate the next SM-2 parameters based on review quality.
 * 
 * @param current - Current SM-2 parameters
 * @param rating - Review rating (0-3)
 * @returns New SM-2 parameters with next review date
 */
export function calculateNextReview(
    current: SM2Parameters,
    rating: ReviewRating
): SM2Result {
    let { easeFactor, interval, repetitions } = current;

    // Quality mapping: 0=Again, 1=Hard, 2=Good, 3=Easy
    // SM-2 uses 0-5 scale, we map our 0-3 to the critical thresholds
    const qualityScore = rating === 0 ? 0 : rating === 1 ? 2 : rating === 2 ? 4 : 5;

    if (qualityScore < 3) {
        // Failed: reset repetitions, short interval
        repetitions = 0;
        interval = 1;
    } else {
        // Success: increase interval
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    }

    // Update ease factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const efDelta = 0.1 - (5 - qualityScore) * (0.08 + (5 - qualityScore) * 0.02);
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + efDelta);

    // Apply rating-specific adjustments
    if (rating === 3) {
        // Easy bonus
        easeFactor += EASE_BONUS;
        interval = Math.round(interval * 1.3);
    } else if (rating === 1) {
        // Hard penalty (but not as severe as Again)
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - EASE_PENALTY);
        interval = Math.max(1, Math.round(interval * 0.5));
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
        easeFactor,
        interval,
        repetitions,
        nextReviewDate,
    };
}

/**
 * Get default SM-2 parameters for a new card.
 */
export function getDefaultSM2Parameters(): SM2Parameters {
    return {
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
    };
}

/**
 * Extract SM-2 parameters from a Flashcard entity.
 */
export function extractSM2Parameters(card: Flashcard): SM2Parameters {
    return {
        easeFactor: card.ease_factor ?? DEFAULT_EASE_FACTOR,
        interval: card.interval ?? 0,
        repetitions: card.repetitions ?? 0,
    };
}

/**
 * Calculate priority score for card ordering.
 * Higher score = should be reviewed first.
 * 
 * @param card - Flashcard to score
 * @returns Priority score (higher = more urgent)
 */
export function calculatePriorityScore(card: Flashcard): number {
    const now = Date.now();

    // Base priority from learning state
    const statePriority: Record<string, number> = {
        new: 50,
        learning: 100,
        review: 75,
        mastered: 25,
    };

    let score = statePriority[card.learning_state] ?? 50;

    // Overdue bonus
    if (card.next_review) {
        const nextReview = new Date(card.next_review).getTime();
        const overdueMs = now - nextReview;
        const overdueDays = overdueMs / (1000 * 60 * 60 * 24);

        if (overdueDays > 0) {
            // Overdue cards get priority boost (max +50)
            score += Math.min(50, overdueDays * 10);
        }
    }

    // Lower accuracy = higher priority
    if (card.accuracy !== undefined) {
        score += (1 - card.accuracy) * 30;
    }

    return score;
}

/**
 * Sort cards by priority for optimal review order.
 */
export function sortByPriority(cards: Flashcard[]): Flashcard[] {
    return [...cards].sort((a, b) => {
        const scoreA = a.priority_score ?? calculatePriorityScore(a);
        const scoreB = b.priority_score ?? calculatePriorityScore(b);
        return scoreB - scoreA; // Higher priority first
    });
}

/**
 * Determine the new learning state based on SM-2 result.
 */
export function determineNewLearningState(
    result: SM2Result
): string {
    if (result.repetitions === 0) {
        // Failed review
        return 'learning';
    }

    if (result.interval >= 21) {
        // 21+ day interval = mastered
        return 'mastered';
    }

    if (result.interval >= 1) {
        // At least 1 day interval = review
        return 'review';
    }

    // Still learning
    return 'learning';
}
