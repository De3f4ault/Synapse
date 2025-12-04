import { useQuery } from '@tanstack/react-query';
import { getRecommendationsApiV1StudyRecommendationsGet } from '@/api/generated/services.gen';
import type { StudyItemResponse } from '@/api/generated/types.gen';
import { QUERY_KEYS } from '@/lib/constants';
import type {
    RecommendedItem,
    LearningPath,
    SuggestedTopic,
    StudyItemType
} from '../../../pages/study/types/study.types';

/**
 * Hook for fetching AI-powered study recommendations
 *
 * Returns items prioritized by:
 * - Weak areas (low mastery)
 * - Review patterns (not reviewed recently)
 * - Learning goals
 */
export function useRecommendations(limit: number = 10) {
    return useQuery({
        queryKey: [...QUERY_KEYS.STUDY.RECOMMENDATIONS, limit],
        queryFn: async () => {
            const response = await getRecommendationsApiV1StudyRecommendationsGet({
                limit,
            });

            return response.map(transformRecommendation);
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

/**
 * Hook for fetching learning paths
 *
 * Returns structured learning curricula based on user's progress
 * NOTE: Backend endpoint not yet implemented - returns empty array
 */
export function useLearningPaths() {
    return useQuery({
        queryKey: ['learning-paths'],
        queryFn: async (): Promise<LearningPath[]> => {
            // Backend endpoint /api/v1/study/paths not yet implemented
            // Once available, use: getLearningPathsApiV1StudyPathsGet()
            return [];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}

/**
 * Hook for fetching suggested topics based on weak areas
 *
 * Returns topics that need attention based on performance
 * NOTE: Backend endpoint not yet implemented - returns empty array
 */
export function useSuggestedTopics() {
    return useQuery({
        queryKey: ['suggested-topics'],
        queryFn: async (): Promise<SuggestedTopic[]> => {
            // Backend endpoint /api/v1/study/topics not yet implemented
            // Once available, use: getSuggestedTopicsApiV1StudyTopicsGet()
            return [];
        },
        staleTime: 1000 * 60 * 15, // 15 minutes
    });
}

/**
 * Transform API response to RecommendedItem format
 */
function transformRecommendation(item: StudyItemResponse): RecommendedItem {
    const baseItem = {
        id: item.id,
        type: item.type as StudyItemType,
        title: item.data.front_text || item.data.title || 'Untitled',
        module: item.type === 'flashcard' ? 'flashcards' : 'quizzes',
        priority: (item.data.priority || 'normal') as any,
        estimatedTime: calculateEstimatedTime(item),
        difficulty: calculateDifficulty(item),
        masteryLevel: calculateMasteryLevel(item.data),
        reason: generateReason(item),
        confidence: calculateConfidence(item.data),
        suggestedDuration: calculateEstimatedTime(item),
        relatedTopics: extractRelatedTopics(item),
    };

    return baseItem;
}

/**
 * Calculate estimated time for an item (in minutes)
 */
function calculateEstimatedTime(item: StudyItemResponse): number {
    if (item.type === 'flashcard') {
        return 2; // 2 minutes per flashcard
    }

    if (item.type === 'quiz') {
        return item.data.time_limit_minutes || item.data.question_count * 2;
    }

    return 5; // Default
}

/**
 * Calculate difficulty (1-5 scale)
 */
function calculateDifficulty(item: StudyItemResponse): number {
    if (item.type === 'flashcard') {
        const easeFactor = item.data.ease_factor || 2.5;
        // Ease factor: 1.3 (hard) to 3.0 (easy)
        // Convert to difficulty: 5 (hard) to 1 (easy)
        const normalized = (easeFactor - 1.3) / (3.0 - 1.3);
        return Math.round(5 - normalized * 4);
    }

    if (item.type === 'quiz') {
        const difficultyMap: Record<string, number> = {
            'easy': 2,
            'medium': 3,
            'hard': 4,
        };
        return difficultyMap[item.data.difficulty] || 3;
    }

    return 3;
}

/**
 * Calculate mastery level (0-100)
 */
function calculateMasteryLevel(data: any): number {
    if (data.accuracy !== undefined) {
        return Math.round(data.accuracy);
    }

    if (data.last_score !== undefined) {
        return Math.round(data.last_score);
    }

    // For flashcards, estimate from ease factor and reviews
    const timesReviewed = data.times_reviewed || 0;
    const easeFactor = data.ease_factor || 2.5;

    const reviewBonus = Math.min(timesReviewed * 5, 30);
    const easeScore = ((easeFactor - 1.3) / (3.0 - 1.3)) * 70;

    return Math.min(100, Math.round(reviewBonus + easeScore));
}

/**
 * Generate reason for recommendation
 */
function generateReason(item: StudyItemResponse): string {
    const priority = item.data.priority;
    const masteryLevel = calculateMasteryLevel(item.data);

    if (priority === 'high') {
        return 'This item is overdue for review';
    }

    if (priority === 'new') {
        return 'New item to learn';
    }

    if (masteryLevel < 50) {
        return 'Low mastery - needs more practice';
    }

    if (masteryLevel < 70) {
        return 'Building mastery - reinforce learning';
    }

    if (item.data.days_since_review > 14) {
        return 'Not reviewed recently - prevent forgetting';
    }

    return 'Recommended based on your learning patterns';
}

/**
 * Calculate confidence score (0-1)
 */
function calculateConfidence(data: any): number {
    // Base confidence on:
    // 1. How much data we have about this item
    // 2. How clear the learning pattern is

    const hasReviews = (data.times_reviewed || 0) > 0;
    const hasAccuracy = data.accuracy !== undefined;
    const hasPriority = data.priority !== undefined;

    let confidence = 0.5; // Base confidence

    if (hasReviews) confidence += 0.2;
    if (hasAccuracy) confidence += 0.2;
    if (hasPriority) confidence += 0.1;

    return Math.min(1, confidence);
}

/**
 * Extract related topics/tags from item data
 */
function extractRelatedTopics(item: StudyItemResponse): string[] {
    const topics: string[] = [];

    // From tags
    if (item.data.tags && Array.isArray(item.data.tags)) {
        topics.push(...item.data.tags);
    }

    // From deck name (for flashcards)
    if (item.data.deck_name) {
        topics.push(item.data.deck_name);
    }

    // From quiz difficulty
    if (item.data.difficulty) {
        topics.push(item.data.difficulty);
    }

    return [...new Set(topics)]; // Remove duplicates
}
