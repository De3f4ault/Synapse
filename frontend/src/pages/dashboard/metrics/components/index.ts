/**
 * Metrics Module - Components Public API
 */

// Primary display components
export { StatusCard } from "./StatusCard";
export type { StatusCardProps } from "./StatusCard";

// StatCard - Re-exported from shared/ui (canonical source)
export {
    StatCard,
    StatCardGrid,
    TotalReviewsCard,
    AccuracyCard,
    StudyTimeCard,
    StreakStatCard,
    type StatCardProps,
} from "@/shared/ui";

// Full visualization component
export { StreakCard } from "./StreakCard";
export type { StreakCardProps } from "./StreakCard";

// Dashboard awareness cards
export { TodaysProgressCard } from "./TodaysProgressCard";
export { ReviewForecastCard } from "./ReviewForecastCard";
export { LastSessionCard } from "./LastSessionCard";
