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
    TodaysProgressCard,
    ReviewForecastCard,
    LastSessionCard,
} from "./components";

export type { StatusCardProps, StatCardProps, StreakCardProps } from "./components";

// Hooks
export { useMetrics, useTodayStats, useForecast, useLastSession } from "./hooks";
export type { DashboardMetrics, TodayStats, ReviewForecast, LastSessionStats } from "./hooks";
