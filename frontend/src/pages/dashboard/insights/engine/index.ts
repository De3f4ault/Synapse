/**
 * Insights Engine - Public API
 * 
 * This is the ONLY entry point for insights engine functions.
 * All functions are PURE (no side effects) and deterministic.
 * 
 * The engine is the AUTHORITY for intelligence computation.
 * Stores cache outputs, but engine defines what insights exist.
 */

// Types
export type {
    DashboardDataInput,
    ActivityStats,
    InsightType,
    SeverityLevel,
    TrendDirection,
    MilestoneLevel,
    ModuleType,
    WeakAreaSource,
    IntelligenceInsight,
    WeakAreaInsight,
    NextActionRecommendation,
    MilestoneAchievement,
    InsightsOutput,
} from "./types";

// Pure engine functions
export { computeWeakAreas, mergeWeakAreas, mergeGIEWeakAreas, calculatePriority } from "./computeWeakAreas";
export { suggestNextAction } from "./suggestNextActions";
export { generateMilestones } from "./generateMilestones";
export { generateContextInsights } from "./generateContextInsights";
