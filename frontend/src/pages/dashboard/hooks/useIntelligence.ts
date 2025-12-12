import { useMemo } from 'react';
import type { DashboardData } from '../types/dashboard.types';
import type {
    IntelligenceInsight,
    WeakAreaInsight,
    NextActionRecommendation,
    MilestoneAchievement
} from '../types/intelligence.types';
import { calculatePriority } from '../utils/priorityCalculator';
import { formatRelativeTime } from '@/lib/utils';

/**
 * useIntelligence Hook
 *
 * Processes dashboard data to generate intelligent insights:
 * - Weak area detection with severity classification
 * - Next action recommendations with priority scoring
 * - Milestone achievement detection
 * - Context-aware suggestions
 *
 * FIXED: Added defensive programming to handle invalid/missing data
 */
export function useIntelligence(data: DashboardData | undefined) {
    // Process weak areas with enhanced insights
    const weakAreas = useMemo((): WeakAreaInsight[] => {
        // FIXED: Add defensive checks for weakAreas
        if (!data?.weakAreas || !Array.isArray(data.weakAreas)) {
            console.warn('[useIntelligence] Invalid weakAreas data:', data?.weakAreas);
            return [];
        }

        return data.weakAreas.map((area) => {
            const priority = calculatePriority({
                dueDate: null, // Weak areas aren't time-bound
                isWeakArea: true,
                accuracy: area.accuracy || 0,
                hasPrerequisites: false,
                lastAccessed: null,
            });

            // Determine severity level
            let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
            const accuracy = area.accuracy || 0;
            if (accuracy < 0.4) severity = 'critical';
            else if (accuracy < 0.55) severity = 'high';
            else if (accuracy < 0.7) severity = 'medium';

            // Generate actionable suggestion
            const suggestion = generateWeakAreaSuggestion(area, data);

            return {
                ...area,
                priority,
                severity,
                suggestion,
                trend: (area.review_count || 0) > 5 ? detectTrend(area) : null,
            };
        }).sort((a, b) => b.priority - a.priority);
    }, [data?.weakAreas, data]);

    // Generate next action recommendation
    const nextAction = useMemo((): NextActionRecommendation | null => {
        if (!data) return null;

        // Collect all possible actions
        const candidates: Array<{
            type: string;
            title: string;
            description: string;
            priority: number;
            estimatedMinutes: number;
            itemCount?: number;
            moduleType: string;
            actionData: any;
        }> = [];

        // 1. Due flashcards (highest priority)
        // FIXED: Check if dueCards is an array
        if (data.dueCards && Array.isArray(data.dueCards) && data.dueCards.length > 0) {
            const dueCount = data.dueCards.length;
            const avgAccuracy = data.overview?.overall_accuracy || 0.7;

            candidates.push({
                type: 'review_flashcards',
                title: `Review ${dueCount} flashcard${dueCount > 1 ? 's' : ''}`,
                description: `${dueCount} card${dueCount > 1 ? 's are' : ' is'} due for review`,
                priority: calculatePriority({
                    dueDate: new Date().toISOString(),
                                            isWeakArea: avgAccuracy < 0.7,
                                            accuracy: avgAccuracy,
                                            hasPrerequisites: false,
                                            lastAccessed: null,
                }),
                estimatedMinutes: Math.ceil(dueCount * 1.5), // ~90 seconds per card
                            itemCount: dueCount,
                            moduleType: 'flashcards',
                            actionData: { deckId: null, cardCount: dueCount },
            });
        }

        // 2. Weak areas that need attention
        if (weakAreas.length > 0 && weakAreas[0].severity !== 'low') {
            const worstArea = weakAreas[0];
            candidates.push({
                type: 'practice_weak_area',
                title: `Practice ${worstArea.topic}`,
                description: `Accuracy is ${(worstArea.accuracy * 100).toFixed(0)}% - needs improvement`,
                            priority: worstArea.priority,
                            estimatedMinutes: 15,
                            moduleType: 'flashcards',
                            actionData: { topic: worstArea.topic, accuracy: worstArea.accuracy },
            });
        }

        // 3. Unread documents
        // FIXED: Check if documents is an array
        const unreadDocs = (data.documents && Array.isArray(data.documents))
        ? data.documents.filter(doc =>
        doc.processing_status === 'completed' &&
        !doc.user_id // Simple heuristic: no user_id means unprocessed
        )
        : [];

        if (unreadDocs.length > 0) {
            candidates.push({
                type: 'read_document',
                title: `Read ${unreadDocs[0].filename || 'Untitled Document'}`,
                description: `${unreadDocs.length} document${unreadDocs.length > 1 ? 's' : ''} waiting to be processed`,
                priority: calculatePriority({
                    dueDate: null,
                    isWeakArea: false,
                    accuracy: 1,
                    hasPrerequisites: false,
                    lastAccessed: unreadDocs[0].created_at,
                }),
                estimatedMinutes: 20,
                itemCount: unreadDocs.length,
                moduleType: 'documents',
                actionData: { documentId: unreadDocs[0].id },
            });
        }

        // 4. Incomplete notes (notes without much content)
        // FIXED: Check if notes is an array
        const incompleteNotes = (data.notes && Array.isArray(data.notes))
        ? data.notes.filter(note => (note.content?.length || 0) < 200)
        : [];

        if (incompleteNotes.length > 0) {
            candidates.push({
                type: 'complete_note',
                title: `Complete note: ${incompleteNotes[0].title || 'Untitled Note'}`,
                description: `${incompleteNotes.length} note${incompleteNotes.length > 1 ? 's need' : ' needs'} expansion`,
                priority: 0.5,
                estimatedMinutes: 10,
                itemCount: incompleteNotes.length,
                moduleType: 'notes',
                actionData: { noteId: incompleteNotes[0].id },
            });
        }

        // 5. Pending quizzes
        // FIXED: Check if quizzes is an array
        if (data.quizzes && Array.isArray(data.quizzes) && data.quizzes.length > 0) {
            const pendingQuiz = data.quizzes[0];
            candidates.push({
                type: 'take_quiz',
                title: `Take quiz: ${pendingQuiz.title || 'Untitled Quiz'}`,
                description: `Test your knowledge with a ${pendingQuiz.difficulty || 'medium'} quiz`,
                priority: 0.6,
                estimatedMinutes: pendingQuiz.time_limit_minutes || 15,
                moduleType: 'quizzes',
                actionData: { quizId: pendingQuiz.id },
            });
        }

        // Select highest priority action
        if (candidates.length === 0) return null;

        const bestAction = candidates.sort((a, b) => b.priority - a.priority)[0];

        return {
            type: bestAction.type,
            title: bestAction.title,
            description: bestAction.description,
            priority: bestAction.priority,
            confidence: calculateConfidence(bestAction, data),
                               estimatedMinutes: bestAction.estimatedMinutes,
                               reasoning: generateReasoning(bestAction, data),
                               itemCount: bestAction.itemCount,
                               moduleType: bestAction.moduleType,
                               actionUrl: generateActionUrl(bestAction),
                               actionData: bestAction.actionData,
        };
    }, [data, weakAreas]);

    // Detect milestones and achievements
    const milestones = useMemo((): MilestoneAchievement[] => {
        if (!data?.overview) return [];

        const achievements: MilestoneAchievement[] = [];
        const overview = data.overview;

        // Streak milestones
        // FIXED: Add default value for study_streak_days
        if ((overview.study_streak_days || 0) >= 7) {
            const streakDays = overview.study_streak_days || 0;
            const level =
            streakDays >= 365 ? 'legendary' :
            streakDays >= 100 ? 'epic' :
            streakDays >= 30 ? 'rare' :
            'common';

    achievements.push({
        id: 'streak',
        type: 'streak',
        title: `${streakDays}-Day Streak!`,
        description: `You've studied for ${streakDays} consecutive days`,
        icon: '🔥',
        level,
        timestamp: new Date().toISOString(),
                      value: streakDays,
                      metadata: { streakDays },
    });
        }

        // Mastery milestone (high accuracy)
        // FIXED: Add default value for overall_accuracy
        if ((overview.overall_accuracy || 0) >= 0.85) {
            const accuracy = overview.overall_accuracy || 0;
            achievements.push({
                id: 'mastery',
                type: 'mastery',
                title: 'Mastery Achieved!',
                description: `${(accuracy * 100).toFixed(0)}% overall accuracy`,
                              icon: '🎓',
                              level: accuracy >= 0.95 ? 'epic' : 'rare',
                              timestamp: new Date().toISOString(),
                              value: accuracy,
                              metadata: { accuracy },
            });
        }

        // Volume milestone (cards reviewed)
        if (overview.total_reviews && overview.total_reviews >= 100) {
            const milestoneThresholds = [100, 500, 1000, 5000, 10000];
            const reachedMilestone = milestoneThresholds
            .reverse()
            .find(threshold => (overview.total_reviews || 0) >= threshold);

            if (reachedMilestone) {
                achievements.push({
                    id: 'volume',
                    type: 'volume',
                    title: `${reachedMilestone.toLocaleString()} Reviews!`,
                                  description: 'Your dedication is paying off',
                                  icon: '📚',
                                  level: reachedMilestone >= 5000 ? 'legendary' : reachedMilestone >= 1000 ? 'epic' : 'rare',
                                  timestamp: new Date().toISOString(),
                                  value: overview.total_reviews,
                                  metadata: { totalReviews: overview.total_reviews },
                });
            }
        }

        // Productivity milestone (cards reviewed today)
        // FIXED: Add default value for cards_reviewed_today
        if ((overview.cards_reviewed_today || 0) >= 20) {
            const reviewsToday = overview.cards_reviewed_today || 0;
            achievements.push({
                id: 'productivity',
                type: 'productivity',
                title: 'Productive Day!',
                description: `${reviewsToday} cards reviewed today`,
                icon: '⚡',
                level: reviewsToday >= 50 ? 'rare' : 'common',
                timestamp: new Date().toISOString(),
                              value: reviewsToday,
                              metadata: { reviewsToday },
            });
        }

        return achievements;
    }, [data?.overview]);

    // Generate general context insights
    const contextInsights = useMemo((): IntelligenceInsight[] => {
        if (!data?.overview) return [];

        const insights: IntelligenceInsight[] = [];

        // Study pattern insight
        // FIXED: Add default value for study_streak_days
        if ((data.overview.study_streak_days || 0) > 0) {
            insights.push({
                type: 'pattern',
                title: 'Consistent Progress',
                message: `You're on a ${data.overview.study_streak_days}-day streak. Keep it up!`,
                confidence: 0.9,
                actionable: false,
                icon: '📈',
            });
        }

        // Due cards urgency
        // FIXED: Check if dueCards is array
        if (data.dueCards && Array.isArray(data.dueCards) && data.dueCards.length > 10) {
            insights.push({
                type: 'urgency',
                title: 'Many Cards Due',
                message: `${data.dueCards.length} cards are waiting for review`,
                confidence: 1.0,
                actionable: true,
                icon: '⏰',
                action: {
                    label: 'Start Review',
                    url: '/flashcards/review',
                },
            });
        }

        // Content creation suggestion
        // FIXED: Add default values and array checks
        const docCount = (data.documents && Array.isArray(data.documents)) ? data.documents.length : 0;
        const noteCount = (data.notes && Array.isArray(data.notes)) ? data.notes.length : 0;

        if (docCount > noteCount * 2 && docCount > 0) {
            insights.push({
                type: 'suggestion',
                title: 'Take More Notes',
                message: `You have ${docCount} documents but only ${noteCount} notes. Consider taking notes to improve retention.`,
                confidence: 0.7,
                actionable: true,
                icon: '📝',
                action: {
                    label: 'Create Note',
                    url: '/notes/new',
                },
            });
        }

        return insights;
    }, [data]);

    return {
        weakAreas,
        nextAction,
        milestones,
        contextInsights,
        isLoading: !data,
    };
}

// Helper functions

function generateWeakAreaSuggestion(area: any, data: DashboardData | undefined): string {
    const accuracy = area.accuracy || 0;
    if (accuracy < 0.4) {
        return 'Critical: Review fundamentals with focused study session';
    } else if (accuracy < 0.55) {
        return 'High priority: Practice with spaced repetition';
    } else if (accuracy < 0.7) {
        return 'Moderate: Regular review recommended';
    }
    return 'Continue practicing to maintain mastery';
}

function detectTrend(area: any): 'improving' | 'declining' | 'stable' {
    // Simple heuristic: if accuracy is above 0.6, trending up
    const accuracy = area.accuracy || 0;
    const reviewCount = area.review_count || 0;

    if (accuracy > 0.65 && reviewCount > 10) return 'improving';
    if (accuracy < 0.5) return 'declining';
    return 'stable';
}

function calculateConfidence(action: any, data: DashboardData | undefined): number {
    // Confidence based on data quality and action type
    if (action.type === 'review_flashcards' && action.itemCount > 0) return 1.0;
    if (action.type === 'practice_weak_area') return 0.85;
    return 0.7;
}

function generateReasoning(action: any, data: DashboardData | undefined): string {
    switch (action.type) {
        case 'review_flashcards':
            return 'These cards are due for review based on spaced repetition schedule';
        case 'practice_weak_area':
            return 'Your accuracy in this area is below target - focused practice will help';
        case 'read_document':
            return 'Processing this document will unlock new learning opportunities';
        case 'complete_note':
            return 'Expanding this note will improve retention and understanding';
        case 'take_quiz':
            return 'Testing yourself helps identify knowledge gaps';
        default:
            return 'Recommended based on your learning patterns';
    }
}

function generateActionUrl(action: any): string {
    switch (action.type) {
        case 'review_flashcards':
            return '/flashcards/review';
        case 'practice_weak_area':
            return `/flashcards/review?topic=${encodeURIComponent(action.actionData.topic)}`;
        case 'read_document':
            return `/documents/${action.actionData.documentId}`;
        case 'complete_note':
            return `/notes/${action.actionData.noteId}`;
        case 'take_quiz':
            return `/quizzes/${action.actionData.quizId}/start`;
        default:
            return '/dashboard';
    }
}
