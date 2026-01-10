/**
 * Insights Engine Types
 * 
 * Type definitions for the intelligence engine.
 * The engine is the authority - stores cache computed outputs.
 */

import type { DashboardOverview, WeakArea } from "@/api/generated";

// ============================================================
// Input Types (Raw data from domain modules)
// ============================================================

export interface DashboardDataInput {
    overview: DashboardOverview | null;
    weakAreas: WeakArea[];
    dueCards: Array<{ id: number }>;
    documents: Array<{ id: number; filename?: string; processing_status?: string; user_id?: number; created_at?: string }>;
    notes: Array<{ id: number; title?: string; content?: string }>;
    quizzes: Array<{ id: number; title?: string; difficulty?: string; time_limit_minutes?: number }>;
}

export interface ActivityStats {
    currentStreak: number;
    longestStreak: number;
    weeklyAverage: number;
    totalActivities: number;
}

// ============================================================
// Output Types (Computed insights)
// ============================================================

export type InsightType =
    | "urgency"
    | "pattern"
    | "suggestion"
    | "context"
    | "streak_milestone"
    | "warning"
    | "challenge"
    | "success"
    | "progress"
    | "achievement"
    | "mastery";

export type SeverityLevel = "critical" | "high" | "medium" | "low";
export type TrendDirection = "improving" | "declining" | "stable";
export type MilestoneLevel = "common" | "rare" | "epic" | "legendary";
export type ModuleType = "flashcards" | "documents" | "notes" | "quizzes" | "chat";

/**
 * Source of weakness detection.
 * - api: Detected from historical performance data
 * - graph: Detected from recent learning interactions (spaced repetition)
 * - gie: Detected by Graph Intelligence Engine (mastery + stability)
 * - hybrid: Confirmed by multiple sources (highest confidence)
 */
export type WeakAreaSource = "api" | "graph" | "gie" | "hybrid";

export interface IntelligenceInsight {
    id?: string;
    type: InsightType;
    title: string;
    message?: string;
    description?: string;
    confidence?: number; // 0-1
    actionable?: boolean;
    icon?: string;
    action?: {
        label: string;
        url?: string;
    };
    actions?: Array<{
        label: string;
        action: string;
        metadata?: Record<string, unknown>;
    }>;
}

export interface WeakAreaInsight extends WeakArea {
    priority: number; // 0-1 calculated priority
    severity: SeverityLevel;
    suggestion: string;
    trend: TrendDirection | null;

    /** Source of weakness detection */
    source: WeakAreaSource;

    /** Stability score from GIE (0-1, lower = more at risk of decay) */
    stability?: number;

    /** When this weakness was first detected */
    detectedAt?: string;

    /** Last time the user interacted with this concept */
    lastReinforcedAt?: string;

    /** Graph edge strength (if from graph) */
    graphStrength?: number;
}

export interface NextActionRecommendation {
    type: string;
    title: string;
    description: string;
    priority: number; // 0-1
    confidence: number; // 0-1
    estimatedMinutes: number;
    reasoning: string;
    itemCount?: number;
    moduleType: ModuleType;
    actionUrl: string;
    actionData: Record<string, unknown>;
}

export interface MilestoneAchievement {
    id: string;
    type: "streak" | "mastery" | "volume" | "accuracy" | "productivity";
    title: string;
    description: string;
    icon: string;
    level: MilestoneLevel;
    timestamp: string;
    value: number;
    metadata: Record<string, unknown>;
}

// ============================================================
// Engine Output (Complete computed intelligence)
// ============================================================

export interface InsightsOutput {
    weakAreas: WeakAreaInsight[];
    nextAction: NextActionRecommendation | null;
    milestones: MilestoneAchievement[];
    contextInsights: IntelligenceInsight[];
}
