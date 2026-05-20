/**
 * Shared UI - Public API
 *
 * INVARIANT: This is the canonical source for all UI primitives.
 * INVARIANT: Modules may wrap these, but NEVER fork them.
 *
 * Rule: No module may define its own Empty/Loading/Error components.
 */

// States
export {
    EmptyState,
    LoadingState,
    ErrorState,
    CenteredLoadingSpinner,
    type EmptyStateProps,
    type EmptyStateVariant,
    type EmptyStateAction,
    type LoadingStateProps,
    type LoadingVariant,
    type LoadingSize,
    type ErrorStateProps,
    type ErrorStateVariant,
} from "./states";

// Backgrounds
export {
    AuroraBackground,
    type AuroraBackgroundProps,
    type AuroraVariant,
} from "./backgrounds";

// Cards
export {
    GlassCard,
    type GlassCardProps,
    StatCard,
    StatCardGrid,
    TotalReviewsCard,
    AccuracyCard,
    StudyTimeCard,
    StreakStatCard,
    type StatCardProps,
} from "./cards";

// Sidebar
export {
    SidebarShell,
    type SidebarShellProps,
    type CollapsedAction,
} from "./SidebarShell";
