/**
 * Card Scheduler Utilities
 * Advanced scheduling and prioritization logic
 */

import type { Flashcard, LearningState } from '../types/flashcards.types';
import { isCardDue } from './spacedRepetition';

/**
 * Priority scoring system for card review order
 */
export function calculateCardPriority(card: Flashcard): number {
    let score = 0;

    // 1. Overdue cards get highest priority
    const daysOverdue = getDaysOverdue(card.next_review_date);
    if (daysOverdue > 0) {
        score += daysOverdue * 10; // 10 points per day overdue
    }

    // 2. Lower accuracy = higher priority
    score += (1 - card.accuracy) * 20; // Up to 20 points

    // 3. Learning state matters
    const stateScores: Record<LearningState, number> = {
        new: 15,
        learning: 10,
        review: 5,
        mastered: 0,
    };
    score += stateScores[card.learning_state];

    // 4. Lower easiness = needs more attention
    score += (2.5 - card.easiness_factor) * 5;

    return Math.round(score);
}

/**
 * Get days a card is overdue
 */
export function getDaysOverdue(nextReviewDate: string): number {
    const now = new Date();
    const reviewDate = new Date(nextReviewDate);
    const diffTime = now.getTime() - reviewDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

/**
 * Sort cards by priority for optimal review order
 */
export function sortCardsByPriority(cards: Flashcard[]): Flashcard[] {
    return [...cards].sort((a, b) => {
        const priorityA = calculateCardPriority(a);
        const priorityB = calculateCardPriority(b);
        return priorityB - priorityA; // Highest priority first
    });
}

/**
 * Group cards by learning state
 */
export function groupCardsByState(cards: Flashcard[]): Record<LearningState, Flashcard[]> {
    return cards.reduce(
        (acc, card) => {
            const state = card.learning_state || 'new'; // Fallback to 'new' if undefined
            if (!acc[state]) {
                acc[state] = [];
            }
            acc[state].push(card);
            return acc;
        },
        {
            new: [],
            learning: [],
            review: [],
            mastered: [],
        } as Record<LearningState, Flashcard[]>
    );
}

/**
 * Create a balanced review session
 * Mixes card types for optimal learning
 */
export function createBalancedSession(
    cards: Flashcard[],
    sessionLength: number
): Flashcard[] {
    const grouped = groupCardsByState(cards);
    const result: Flashcard[] = [];

    // Calculate proportions (prioritize due cards)
    const dueCards = cards.filter((c) => isCardDue(c.next_review_date));
    const proportions = {
        new: Math.min(grouped.new.length, Math.ceil(sessionLength * 0.2)),
        learning: Math.min(grouped.learning.length, Math.ceil(sessionLength * 0.3)),
        review: Math.min(grouped.review.length, Math.ceil(sessionLength * 0.4)),
        mastered: Math.min(grouped.mastered.length, Math.ceil(sessionLength * 0.1)),
    };

    // Sort each group by priority
    const sortedGroups = {
        new: sortCardsByPriority(grouped.new),
        learning: sortCardsByPriority(grouped.learning),
        review: sortCardsByPriority(grouped.review),
        mastered: sortCardsByPriority(grouped.mastered),
    };

    // Build session
    const states: LearningState[] = ['new', 'learning', 'review', 'mastered'];
    for (const state of states) {
        result.push(...sortedGroups[state].slice(0, proportions[state]));
    }

    // Fill remaining slots with highest priority due cards
    const remaining = sessionLength - result.length;
    if (remaining > 0) {
        const additionalDue = sortCardsByPriority(dueCards)
            .filter((c) => !result.includes(c))
            .slice(0, remaining);
        result.push(...additionalDue);
    }

    // Shuffle for variety (but keep high-priority cards early)
    return shuffleWithBias(result);
}

/**
 * Shuffle cards with bias toward high-priority cards appearing earlier
 */
function shuffleWithBias(cards: Flashcard[]): Flashcard[] {
    const withPriority = cards.map((card, index) => ({
        card,
        priority: calculateCardPriority(card),
        originalIndex: index,
    }));

    // Sort by priority with some randomness
    return withPriority
        .sort((a, b) => {
            const priorityDiff = b.priority - a.priority;
            const randomFactor = (Math.random() - 0.5) * 20; // Add randomness
            return priorityDiff + randomFactor;
        })
        .map((item) => item.card);
}

/**
 * Calculate session statistics
 */
export function calculateSessionStats(
    cards: Flashcard[],
    _timeSpent: number
): {
    avgAccuracy: number;
    avgInterval: number;
    stateBreakdown: Record<LearningState, number>;
    estimatedDuration: number;
} {
    const totalCards = cards.length;
    const avgAccuracy = cards.reduce((sum, c) => sum + c.accuracy, 0) / totalCards;
    const avgInterval = cards.reduce((sum, c) => sum + c.interval, 0) / totalCards;

    const stateBreakdown = cards.reduce(
        (acc, card) => {
            acc[card.learning_state]++;
            return acc;
        },
        { new: 0, learning: 0, review: 0, mastered: 0 } as Record<LearningState, number>
    );

    // Estimate 10 seconds per card
    const estimatedDuration = totalCards * 10;

    return {
        avgAccuracy,
        avgInterval: Math.round(avgInterval),
        stateBreakdown,
        estimatedDuration,
    };
}

/**
 * Get next review time estimate
 */
export function getNextReviewTime(cards: Flashcard[]): string | null {
    const dueCards = cards
        .filter((c) => !isCardDue(c.next_review_date))
        .sort((a, b) => {
            return new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime();
        });

    if (dueCards.length === 0 || !dueCards[0]) return null;

    const nextDate = new Date(dueCards[0].next_review_date);
    const now = new Date();
    const diffHours = Math.round((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Less than 1 hour';
    if (diffHours < 24) return `In ${diffHours} hours`;
    const diffDays = Math.round(diffHours / 24);
    return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
}

/**
 * Filter cards by learning state
 */
export function filterByLearningState(
    cards: Flashcard[],
    states: LearningState[]
): Flashcard[] {
    return cards.filter((card) => states.includes(card.learning_state));
}

/**
 * Get cards due today
 */
export function getCardsDueToday(cards: Flashcard[]): Flashcard[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    return cards.filter((card) => {
        const reviewDate = new Date(card.next_review_date);
        return reviewDate <= today;
    });
}

/**
 * Calculate weekly progress
 */
export function calculateWeeklyProgress(cards: Flashcard[]): {
    cardsReviewed: number;
    averageAccuracy: number;
    newCardsMastered: number;
} {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentCards = cards.filter((card) => {
        const updatedAt = new Date(card.updated_at);
        return updatedAt >= oneWeekAgo;
    });

    return {
        cardsReviewed: recentCards.length,
        averageAccuracy: recentCards.reduce((sum, c) => sum + c.accuracy, 0) / recentCards.length || 0,
        newCardsMastered: recentCards.filter((c) => c.learning_state === 'mastered').length,
    };
}
