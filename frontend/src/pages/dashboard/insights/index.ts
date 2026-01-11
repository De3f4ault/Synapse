/**
 * Insights Module - Public API
 * 
 * This is the ONLY entry point for the insights module.
 * No deep imports across modules allowed.
 * 
 * Architecture:
 * - engine/  → Pure functions for intelligence computation (AUTHORITY)
 * - state/   → Zustand store for caching computed insights (CACHE)
 * - hooks/   → Thin hook orchestrating engine + store
 * 
 * Key principle: Engine is authority, store is cache.
 */

// Components
export { WeakAreasList } from "./components";
export { IntelligencePanel } from "./components";

// Main hooks (primary exports)
export { useInsights } from "./hooks";
export { useDashboardIntelligence } from "./hooks";
export type { DiagnosticInsight, DashboardIntelligenceState } from "./hooks";

// Engine functions (for direct use or testing)
export {
    computeWeakAreas,
    suggestNextAction,
    generateMilestones,
    generateContextInsights,
    calculatePriority,
} from "./engine";

// Engine types
export type {
    DashboardDataInput,
    InsightType,
    SeverityLevel,
    TrendDirection,
    MilestoneLevel,
    ModuleType,
    IntelligenceInsight,
    WeakAreaInsight,
    NextActionRecommendation,
    MilestoneAchievement,
    InsightsOutput,
} from "./engine";

// State selectors (for granular access)
export {
    useInsightsStore,
    useWeakAreas,
    useNextAction,
    useMilestones,
    useContextInsights,
    useInsightsComputing,
    useInsightsError,
    useInsightsActions,
} from "./state";
