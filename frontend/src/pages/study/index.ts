/**
 * Study Module - Central Exports
 *
 * This file exports all public APIs from the study module.
 * Import from this file to access any study-related components, hooks, or utilities.
 *
 * Example:
 * import { StudyPage, useDueItems, PriorityIndicator } from '@/pages/study';
 */

// ============================================================================
// MAIN PAGE
// ============================================================================
export { StudyPage } from "./StudyPage";

// ============================================================================
// SESSION COMPONENTS
// ============================================================================
export { StudySession } from "./components/session/StudySession";
export { SessionTimer } from "./components/session/SessionTimer";
export { SessionControls } from "./components/session/SessionControls";

// ============================================================================
// QUEUE COMPONENTS
// ============================================================================
export { DueItems } from "./components/queue/DueItems";
export { ItemCard } from "./components/queue/ItemCard";
export {
  PriorityIndicator,
  PriorityDot,
  PriorityBar,
} from "./components/queue/PriorityIndicator";

// ============================================================================
// RECOMMENDATION COMPONENTS
// ============================================================================
export { Recommendations } from "./components/recommendations/Recommendations";
export { RecommendationCard } from "./components/recommendations/RecommendationCard";
export { LearningPath } from "./components/recommendations/LearningPath";
export { SuggestedTopics } from "./components/recommendations/SuggestedTopics";

// ============================================================================
// SHARED COMPONENTS
// ============================================================================
export {
  StudyStats,
  StudyStats as SessionStatsDisplay,
} from "./components/shared/StudyStats";
export {
  StreakIndicator,
  StreakIndicator as StreakBadge,
} from "./components/shared/StreakIndicator";

// ============================================================================
// HOOKS
// ============================================================================
export { useDueItems, useDueItemsStats } from "./hooks/useDueItems";
export {
  useRecommendations,
  useLearningPaths,
  useSuggestedTopics,
} from "./hooks/useRecommendations";
export { useStudySession } from "./hooks/useStudySession";

// ============================================================================
// UTILITIES
// ============================================================================

// Priority Engine Utils
export {
  calculateUrgencyScore,
  getPriorityLevel,
  sortByPriority,
  getOverdueDays,
  filterByPriorityThreshold,
  getPriorityColor,
  getPriorityBadgeVariant,
} from "./utils/priorityEngine";

// Session Scheduler Utils
export {
  calculateSessionDuration,
  suggestOptimalStudyTime,
  createStudyChunks,
  shuffleItems,
  interleaveByModule,
  calculateBreakTime,
  formatDuration,
  formatTimeRemaining,
  isTimeForReview,
  calculateNextReview,
} from "./utils/sessionScheduler";

// ============================================================================
// TYPES
// ============================================================================

// Re-export all types
export type * from "./types/study.types";

// Explicitly export commonly used types for better IDE autocomplete
export type {
  StudyItem,
  RecommendedItem,
  StudySessionState,
  StudyStreak,
  StudySessionResponse,
  StudyPriority,
  StudyItemType,
  SessionStatus,
} from "./types/study.types";
