/**
 * Study Module - Public API
 *
 * Handles the review/study session experience.
 *
 * @exports
 * - Components: FlashcardView, RatingControls, AnswerReveal, AuroraBackground
 * - Hooks: useStudySession, useStudyShortcuts
 * - State: useStudyStore, selectors
 */

// Re-export core types needed by study consumers
export type { Flashcard, ReviewRating, StudySessionStats } from "../core";

// Components
export * from "./components/FlashcardView";
export * from "./components/RatingControls";
export * from "./components/AnswerReveal";

// Re-export AuroraBackground from shared (canonical source)
export { AuroraBackground } from "@/shared/ui";

// Hooks
export * from "./hooks/useStudySession";
export * from "./hooks/useStudyShortcuts";

// State
export * from "./state";

