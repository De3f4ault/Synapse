/**
 * Study Module - Public API
 *
 * Handles the review/study session experience.
 *
 * @exports
 * - Components: FlashcardView, RatingControls, AnswerReveal
 * - Hooks: useStudySession, useStudyShortcuts
 * - State: useStudyStore, selectors
 */

// Re-export core types needed by study consumers
export type { Flashcard, ReviewRating, StudySessionStats } from "../core";

// Components
export * from "./components/FlashcardView";
export * from "./components/RatingControls";
export * from "./components/AnswerReveal";
export * from "./components/CardTutorPanel";

// Hooks
export * from "./hooks/useStudySession";
export * from "./hooks/useStudyShortcuts";
export * from "./hooks/useCardTutorChat";
export * from "./hooks/useCuratedSession";

// State
export * from "./state";

