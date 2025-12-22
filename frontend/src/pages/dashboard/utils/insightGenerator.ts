/**
 * Insight Generator Utility
 *
 * Generates micro-insights from dashboard data for the Intelligence Panel.
 * Detects patterns, milestones, and trends to provide contextual feedback.
 *
 * Types of insights:
 * - Streak milestones (7, 30, 100 day streaks)
 * - Progress insights (week-over-week comparison)
 * - Mastery gains (accuracy improvements)
 * - Volume milestones (100, 500, 1000 reviews)
 * - Behavioral suggestions (based on patterns)
 */

import type { DashboardData } from "../types/dashboard.types";
import type { IntelligenceInsight } from "../types/intelligence.types";
import type { ActivityStats } from "../hooks/useActivityData";

/**
 * Insight generation configuration
 */
interface InsightConfig {
  /**
   * Minimum accuracy improvement to trigger insight
   */
  minAccuracyImprovement: number;

  /**
   * Minimum cards reviewed to trigger volume insights
   */
  minReviewVolume: number;

  /**
   * Streak milestones to celebrate
   */
  streakMilestones: number[];

  /**
   * Review count milestones to celebrate
   */
  reviewMilestones: number[];
}

const DEFAULT_CONFIG: InsightConfig = {
  minAccuracyImprovement: 0.05, // 5% improvement
  minReviewVolume: 10,
  streakMilestones: [7, 14, 30, 60, 100, 365],
  reviewMilestones: [100, 250, 500, 1000, 2500, 5000, 10000],
};

/**
 * Generate all insights from dashboard data
 *
 * @param data - Complete dashboard data
 * @param activityStats - Activity statistics from useActivityData
 * @param config - Insight generation configuration
 * @returns Array of generated insights
 */
export function generateInsights(
  data: DashboardData | undefined,
  activityStats: ActivityStats | undefined,
  config: Partial<InsightConfig> = {},
): IntelligenceInsight[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const insights: IntelligenceInsight[] = [];

  if (!data) return insights;

  // Generate streak insights
  if (activityStats) {
    insights.push(...generateStreakInsights(activityStats, cfg));
  }

  // Generate progress insights
  if (data.overview) {
    insights.push(...generateProgressInsights(data, cfg));
  }

  // Generate mastery insights
  if (data.weakAreas && data.weakAreas.length > 0) {
    insights.push(...generateMasteryInsights(data, cfg));
  }

  // Generate volume insights
  if (data.overview) {
    insights.push(...generateVolumeInsights(data, cfg));
  }

  // Generate behavioral suggestions
  insights.push(...generateBehavioralSuggestions(data, activityStats));

  // Sort by confidence (descending) and take top 5
  return insights
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5);
}

/**
 * Generate streak-related insights
 */
function generateStreakInsights(
  stats: ActivityStats,
  config: InsightConfig,
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  // Check for milestone streaks
  if (config.streakMilestones.includes(stats.currentStreak)) {
    insights.push({
      id: `streak-milestone-${stats.currentStreak}`,
      type: "streak_milestone",
      title: `${stats.currentStreak}-Day Streak!`,
      description: `You've maintained a ${stats.currentStreak}-day learning streak. Keep the momentum going!`,
      confidence: 1.0,
      actionable: true,
      actions: [
        {
          label: "View Activity",
          action: "view_activity",
        },
      ],
    });
  }

  // Warn if streak is about to break
  if (stats.currentStreak > 7 && stats.weeklyAverage < 1) {
    insights.push({
      id: "streak-warning",
      type: "warning",
      title: "Streak at Risk",
      description: `Your ${stats.currentStreak}-day streak needs attention. Complete at least one activity today!`,
      confidence: 0.9,
      actionable: true,
      actions: [
        {
          label: "Start Reviewing",
          action: "start_review",
        },
      ],
    });
  }

  // Longest streak encouragement
  if (stats.longestStreak > stats.currentStreak && stats.currentStreak > 3) {
    const difference = stats.longestStreak - stats.currentStreak;
    insights.push({
      id: "longest-streak-challenge",
      type: "challenge",
      title: "Beat Your Record",
      description: `Your longest streak was ${stats.longestStreak} days. Only ${difference} more days to match it!`,
      confidence: 0.7,
      actionable: true,
    });
  }

  return insights;
}

/**
 * Generate progress-related insights (week-over-week)
 */
function generateProgressInsights(
  data: DashboardData,
  _config: InsightConfig,
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  if (!data.overview) return insights;

  const { cards_reviewed_today, overall_accuracy } = data.overview;

  // Daily review progress
  if (cards_reviewed_today > 0) {
    const percentage = Math.round(
      (cards_reviewed_today / (data.overview.due_cards || 1)) * 100,
    );

    if (percentage >= 100) {
      insights.push({
        id: "daily-goal-complete",
        type: "success",
        title: "Daily Goal Complete!",
        description: `Reviewed all ${cards_reviewed_today} due cards today. Outstanding work!`,
        confidence: 1.0,
        actionable: false,
      });
    } else if (percentage >= 50) {
      insights.push({
        id: "daily-progress",
        type: "progress",
        title: "Good Progress",
        description: `You've reviewed ${percentage}% of today's cards. Keep going!`,
        confidence: 0.8,
        actionable: true,
        actions: [
          {
            label: "Continue Reviewing",
            action: "start_review",
          },
        ],
      });
    }
  }

  // Accuracy insights
  if (overall_accuracy >= 0.9) {
    insights.push({
      id: "high-accuracy",
      type: "success",
      title: "Excellent Accuracy",
      description: `${Math.round(overall_accuracy * 100)}% overall accuracy! You're mastering the material.`,
      confidence: 0.9,
      actionable: false,
    });
  } else if (overall_accuracy < 0.7 && overall_accuracy > 0) {
    insights.push({
      id: "accuracy-improvement",
      type: "suggestion",
      title: "Focus on Weak Areas",
      description: `Your accuracy is ${Math.round(overall_accuracy * 100)}%. Review weak areas to improve retention.`,
      confidence: 0.8,
      actionable: true,
      actions: [
        {
          label: "View Weak Areas",
          action: "view_weak_areas",
        },
      ],
    });
  }

  return insights;
}

/**
 * Generate mastery-related insights
 */
function generateMasteryInsights(
  data: DashboardData,
  _config: InsightConfig,
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  if (!data.weakAreas || data.weakAreas.length === 0) {
    // No weak areas - celebrate mastery!
    insights.push({
      id: "mastery-achieved",
      type: "success",
      title: "Mastery Achieved",
      description:
        "No weak areas detected! You're performing excellently across all topics.",
      confidence: 1.0,
      actionable: false,
    });
    return insights;
  }

  // Critical weak areas need immediate attention
  const criticalAreas = data.weakAreas.filter(
    (area) => area.severity === "critical",
  );
  if (criticalAreas.length > 0) {
    insights.push({
      id: "critical-weak-areas",
      type: "warning",
      title: "Critical Areas Need Attention",
      description: `${criticalAreas.length} topics need immediate review to prevent knowledge loss.`,
      confidence: 0.95,
      actionable: true,
      actions: [
        {
          label: "Review Now",
          action: "review_weak_area",
          metadata: { topic: criticalAreas[0]?.topic ?? "Unknown" },
        },
      ],
    });
  }

  // Improvement opportunity
  const improvableAreas = data.weakAreas.filter(
    (area) => area.severity === "high" && area.review_count > 10,
  );
  if (improvableAreas.length > 0) {
    insights.push({
      id: "improvement-opportunity",
      type: "suggestion",
      title: "Improvement Opportunity",
      description: `Focus on ${improvableAreas[0]?.topic ?? "Unknown"} - it has the highest potential for accuracy gain.`,
      confidence: 0.85,
      actionable: true,
      actions: [
        {
          label: "Start Focused Review",
          action: "review_weak_area",
          metadata: { topic: improvableAreas[0]?.topic ?? "Unknown" },
        },
      ],
    });
  }

  return insights;
}

/**
 * Generate volume-related insights (review milestones)
 */
function generateVolumeInsights(
  data: DashboardData,
  config: InsightConfig,
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  if (!data.overview) return insights;

  const totalReviews = data.overview.total_study_time_minutes || 0; // Using study time as proxy

  // Check for review milestones
  const nextMilestone = config.reviewMilestones.find((m) => m > totalReviews);
  const previousMilestone = config.reviewMilestones
    .reverse()
    .find((m) => m <= totalReviews);

  if (
    previousMilestone &&
    config.reviewMilestones.includes(previousMilestone)
  ) {
    insights.push({
      id: `volume-milestone-${previousMilestone}`,
      type: "achievement",
      title: `${previousMilestone} Reviews Complete!`,
      description: `You've completed ${previousMilestone} reviews. Your dedication is paying off!`,
      confidence: 1.0,
      actionable: false,
    });
  }

  if (nextMilestone) {
    const remaining = nextMilestone - totalReviews;
    insights.push({
      id: `next-milestone-${nextMilestone}`,
      type: "progress",
      title: `${remaining} to ${nextMilestone}`,
      description: `You're ${remaining} reviews away from your next milestone!`,
      confidence: 0.7,
      actionable: true,
    });
  }

  return insights;
}

/**
 * Generate behavioral suggestions based on patterns
 */
function generateBehavioralSuggestions(
  data: DashboardData,
  activityStats: ActivityStats | undefined,
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  if (!data.overview) return insights;

  // Suggest creating more content if ratio is low
  const cardToDeckRatio =
    data.overview.total_cards / Math.max(data.overview.total_decks, 1);
  if (cardToDeckRatio < 5 && data.overview.total_decks > 0) {
    insights.push({
      id: "create-more-cards",
      type: "suggestion",
      title: "Expand Your Decks",
      description:
        "Your decks have few cards. Consider adding more content for better learning.",
      confidence: 0.6,
      actionable: true,
      actions: [
        {
          label: "Create Cards",
          action: "create_cards",
        },
      ],
    });
  }

  // Suggest document upload if none exist
  if (data.overview.total_documents === 0) {
    insights.push({
      id: "upload-documents",
      type: "suggestion",
      title: "Upload Study Materials",
      description:
        "Upload documents to generate flashcards automatically with AI.",
      confidence: 0.7,
      actionable: true,
      actions: [
        {
          label: "Upload Document",
          action: "upload_document",
        },
      ],
    });
  }

  // Suggest taking notes if none exist
  if (data.overview.total_notes === 0) {
    insights.push({
      id: "create-notes",
      type: "suggestion",
      title: "Start Taking Notes",
      description:
        "Create notes to organize your learning and connect concepts.",
      confidence: 0.65,
      actionable: true,
      actions: [
        {
          label: "Create Note",
          action: "create_note",
        },
      ],
    });
  }

  // Consistency suggestion
  if (
    activityStats &&
    activityStats.currentStreak < 3 &&
    activityStats.totalActivities > 10
  ) {
    insights.push({
      id: "consistency-suggestion",
      type: "suggestion",
      title: "Build Consistency",
      description:
        "Study for a few minutes every day to build a strong learning habit.",
      confidence: 0.75,
      actionable: true,
      actions: [
        {
          label: "Set Daily Goal",
          action: "set_goal",
        },
      ],
    });
  }

  return insights;
}
