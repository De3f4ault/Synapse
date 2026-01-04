/**
 * generateMilestones - Pure function to detect achievements
 * 
 * Input: Dashboard overview data
 * Output: List of milestone achievements
 * 
 * NO SIDE EFFECTS - pure transformation.
 */

import type { DashboardOverview } from "@/api/generated";
import type { MilestoneAchievement, MilestoneLevel } from "./types";

/**
 * Generate milestone achievements from overview data
 */
export function generateMilestones(overview: DashboardOverview | null | undefined): MilestoneAchievement[] {
    if (!overview) return [];

    const achievements: MilestoneAchievement[] = [];
    const now = new Date().toISOString();

    // Streak milestones
    const streakDays = overview.study_streak_days || 0;
    if (streakDays >= 7) {
        const level: MilestoneLevel =
            streakDays >= 365 ? "legendary" :
                streakDays >= 100 ? "epic" :
                    streakDays >= 30 ? "rare" : "common";

        achievements.push({
            id: "streak",
            type: "streak",
            title: `${streakDays}-Day Streak!`,
            description: `You've studied for ${streakDays} consecutive days`,
            icon: "",
            level,
            timestamp: now,
            value: streakDays,
            metadata: { streakDays },
        });
    }

    // Mastery milestone (high accuracy)
    const accuracy = overview.overall_accuracy || 0;
    if (accuracy >= 0.85) {
        achievements.push({
            id: "mastery",
            type: "mastery",
            title: "Mastery Achieved!",
            description: `${(accuracy * 100).toFixed(0)}% overall accuracy`,
            icon: "",
            level: accuracy >= 0.95 ? "epic" : "rare",
            timestamp: now,
            value: accuracy,
            metadata: { accuracy },
        });
    }

    // Productivity milestone (cards reviewed today)
    const reviewsToday = overview.cards_reviewed_today || 0;
    if (reviewsToday >= 20) {
        achievements.push({
            id: "productivity",
            type: "productivity",
            title: "Productive Day!",
            description: `${reviewsToday} cards reviewed today`,
            icon: "",
            level: reviewsToday >= 50 ? "rare" : "common",
            timestamp: now,
            value: reviewsToday,
            metadata: { reviewsToday },
        });
    }

    return achievements;
}
