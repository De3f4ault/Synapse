/**
 * Spaced Repetition Algorithm - SuperMemo 2 (SM-2)
 * Implementation for optimal memory retention
 */

import type { SM2Parameters, SM2Result, ReviewQuality } from '../types/flashcards.types';

/**
 * Calculate next review parameters using SM-2 algorithm
 * @param quality - Review quality: 'again' (0), 'hard' (1), 'good' (3), 'easy' (5)
 * @param current - Current SM-2 parameters
 * @returns Updated parameters and next review date
 */
export function calculateNextReview(
    quality: ReviewQuality,
    current: SM2Parameters
): SM2Result {
    const qualityMap = {
        again: 0,
        hard: 1,
        good: 3,
        easy: 5,
    };

    const q = qualityMap[quality];
    let { easinessFactor, interval, repetitions } = current;

    // Update easiness factor
    easinessFactor = Math.max(
        1.3,
        easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    );

    // Update repetitions and interval
    if (q < 3) {
        // Failed recall
        repetitions = 0;
        interval = 1;
    } else {
        // Successful recall
        repetitions += 1;

        if (repetitions === 1) {
            interval = 1;
        } else if (repetitions === 2) {
            interval = 6;
        } else {
            interval = Math.round(interval * easinessFactor);
        }
    }

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
        easinessFactor,
        interval,
        repetitions,
        nextReviewDate,
    };
}

/**
 * Determine learning state based on repetitions and interval
 */
export function determineLearningState(
    repetitions: number,
    interval: number
): 'new' | 'learning' | 'review' | 'mastered' {
    if (repetitions === 0) return 'new';
    if (repetitions < 3 || interval < 7) return 'learning';
    if (interval < 21) return 'review';
    return 'mastered';
}

/**
 * Calculate mastery percentage based on card statistics
 */
export function calculateMastery(
    repetitions: number,
    easinessFactor: number,
    accuracy: number
): number {
    const repWeight = Math.min(repetitions / 10, 1) * 0.4; // 40%
    const easeWeight = ((easinessFactor - 1.3) / (2.5 - 1.3)) * 0.3; // 30%
    const accWeight = accuracy * 0.3; // 30%

    return Math.round((repWeight + easeWeight + accWeight) * 100);
}

/**
 * Check if a card is due for review
 */
export function isCardDue(nextReview?: string | null): boolean {
    if (!nextReview) return true; // New cards without next_review are due
    const now = new Date();
    const reviewDate = new Date(nextReview);
    return now >= reviewDate;
}

/**
 * Get cards that are due for review
 */
export function getDueCards<T extends { next_review?: string | null }>(
    cards: T[]
): T[] {
    return cards.filter((card) => isCardDue(card.next_review));
}

/**
 * Calculate optimal daily review target
 */
export function calculateDailyTarget(
    totalCards: number,
    masteryPercent: number
): number {
    const baseTarget = Math.ceil(totalCards * 0.1); // 10% of deck
    const masteryAdjustment = masteryPercent < 50 ? 1.5 : 1.0;
    return Math.max(5, Math.round(baseTarget * masteryAdjustment));
}

/**
 * Sort cards by priority for review
 */
export function sortByReviewPriority<
    T extends { next_review?: string | null; accuracy?: number }
>(cards: T[]): T[] {
    return [...cards].sort((a, b) => {
        const aDate = a.next_review ? new Date(a.next_review).getTime() : 0;
        const bDate = b.next_review ? new Date(b.next_review).getTime() : 0;

        // First: overdue cards (earlier date = higher priority)
        if (aDate !== bDate) return aDate - bDate;

        // Second: lower accuracy = higher priority
        return (a.accuracy ?? 0) - (b.accuracy ?? 0);
    });
}

/**
 * Generate review recommendations
 */
export function getReviewRecommendations(stats: {
    dueCards: number;
    dailyTarget: number;
    currentStreak: number;
}): {
    shouldReview: boolean;
    message: string;
    priority: 'high' | 'medium' | 'low';
} {
    const { dueCards, dailyTarget, currentStreak } = stats;

    if (dueCards >= dailyTarget * 2) {
        return {
            shouldReview: true,
            message: `${dueCards} cards overdue! Review now to maintain progress.`,
            priority: 'high',
        };
    }

    if (dueCards >= dailyTarget) {
        return {
            shouldReview: true,
            message: `${dueCards} cards ready for review.`,
            priority: 'medium',
        };
    }

    if (dueCards > 0 && currentStreak > 7) {
        return {
            shouldReview: true,
            message: `Keep your ${currentStreak}-day streak going!`,
            priority: 'medium',
        };
    }

    return {
        shouldReview: false,
        message: `All caught up! Next review in ${24 - new Date().getHours()} hours.`,
        priority: 'low',
    };
}

/**
 * Calculate optimal session length
 */
export function calculateSessionLength(
    availableCards: number,
    userPreference?: number
): number {
    const defaultLength = 20;
    const maxLength = 50;

    if (userPreference) {
        return Math.min(userPreference, availableCards, maxLength);
    }

    return Math.min(defaultLength, availableCards);
}
