/**
 * Metrics Module - Public API
 * 
 * This is the ONLY entry point for the metrics module.
 * No deep imports across modules allowed.
 * 
 * Architecture:
 * - components/ → Display components for KPIs, stats, streaks
 * - hooks/      → Data access hooks (no store needed - no interactive state)
 * 
 * Note: No state/ directory - metrics has no interactive UI state.
 * All data is derived from React Query and passed through props.
 */

// Components
export {
    StatusCard,
    StatCard,
    StatCardGrid,
    StreakCard,
    TotalReviewsCard,
    AccuracyCard,
    StudyTimeCard,
    StreakStatCard,
} from "./components";

export type { StatusCardProps, StatCardProps, StreakCardProps } from "./components";

// Hooks
export { useMetrics } from "./hooks";
export type { DashboardMetrics } from "./hooks";
