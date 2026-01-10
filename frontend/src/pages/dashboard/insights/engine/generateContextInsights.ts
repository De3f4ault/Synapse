/**
 * generateContextInsights - Pure function to generate general insights
 * 
 * Input: Dashboard data + computed weak areas
 * Output: Array of context-aware insights
 * 
 * NO SIDE EFFECTS - pure transformation.
 */

import type { DashboardDataInput, WeakAreaInsight, IntelligenceInsight } from "./types";

/**
 * Generate context-aware insights from dashboard data
 */
export function generateContextInsights(
    data: DashboardDataInput | undefined,
    weakAreas: WeakAreaInsight[]
): IntelligenceInsight[] {
    if (!data?.overview) return [];

    const insights: IntelligenceInsight[] = [];
    const overview = data.overview;

    // Study pattern insight
    const streakDays = overview.study_streak_days || 0;
    if (streakDays > 0) {
        insights.push({
            type: "pattern",
            title: "Consistent Progress",
            message: `You're on a ${streakDays}-day streak. Keep it up!`,
            confidence: 0.9,
            actionable: false,
            icon: "",
        });
    }

    // Due cards urgency
    const dueCount = Array.isArray(data.dueCards) ? data.dueCards.length : 0;
    if (dueCount > 10) {
        insights.push({
            type: "urgency",
            title: "Many Cards Due",
            message: `${dueCount} cards are waiting for review`,
            confidence: 1.0,
            actionable: true,
            icon: "",
            action: {
                label: "Start Review",
                url: "/flashcards/review",
            },
        });
    }

    // Daily goal check
    const reviewsToday = overview.cards_reviewed_today || 0;
    if (reviewsToday < 10) {
        insights.push({
            type: "challenge",
            title: "Daily Goal Check",
            description: `You've reviewed ${reviewsToday} cards. Goal: 10.`,
            action: {
                label: "Review Due Cards",
                url: "/flashcards",
            },
            icon: "",
        });
    }

    // Weakest area warning
    const weakest = weakAreas[0];
    if (weakest && weakest.topic && (weakest.accuracy || 0) < 0.6) {
        insights.push({
            type: "warning",
            title: `Struggling with ${weakest.topic}`,
            description: `Your accuracy is ${(weakest.accuracy * 100).toFixed(0)}%. Review to improve.`,
            action: {
                label: "Practice Topic",
                url: `/study/practice?topic=${encodeURIComponent(weakest.topic)}`,
            },
            icon: "",
        });
    }

    // Content creation suggestion
    const docCount = Array.isArray(data.documents) ? data.documents.length : 0;
    const noteCount = Array.isArray(data.notes) ? data.notes.length : 0;

    if (docCount > noteCount * 2 && docCount > 0) {
        insights.push({
            type: "suggestion",
            title: "Take More Notes",
            message: `You have ${docCount} documents but only ${noteCount} notes. Consider taking notes to improve retention.`,
            confidence: 0.7,
            actionable: true,
            icon: "",
            action: {
                label: "Create Note",
                url: "/notes/new",
            },
        });
    }

    return insights;
}
