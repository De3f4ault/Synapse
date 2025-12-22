/**
 * Quizzes Module Exports
 * Central export point for all quizzes-related functionality
 */

// Main Pages
export { QuizzesPage } from "./QuizzesPage";
export { QuizTakePage } from "./QuizTakePage";

// List Components
export { QuizCard } from "./components/list/QuizCard";
export { QuizGrid } from "./components/list/QuizGrid";
export { QuizFilters } from "./components/list/QuizFilters";

// Builder Components
export { QuizBuilder } from "./components/builder/QuizBuilder";

// Taker Components
export { QuestionCard } from "./components/taker/QuestionCard";
export { AnswerOptions } from "./components/taker/AnswerOptions";
export { QuizProgress } from "./components/taker/QuizProgress";
export { QuizTimer } from "./components/taker/QuizTimer";

// Results Components
export { ResultsSummary } from "./components/results/ResultsSummary";
export { QuestionReview } from "./components/results/QuestionReview";
export { PerformanceChart } from "./components/results/PerformanceChart";

// Shared Components
export { QuizStats } from "./components/shared/QuizStats";

// Hooks
export { useQuizzes } from "./hooks/useQuizzes";
export { useQuizAttempt } from "./hooks/useQuizAttempt";
export { useQuizBuilder } from "./hooks/useQuizBuilder";

// Utils
export {
  calculateRank,
  calculateScore,
  calculateStreakBonus,
  calculateTimeBonus,
  calculateFinalScore,
  parseScore,
} from "./utils/quizScoring";

export {
  parseOptions,
  validateQuestionText,
  validateOptions,
  validateCorrectAnswer,
  validateQuestion,
  sanitizeQuestionText,
  formatQuestionForDisplay,
} from "./utils/questionValidator";

// Types
export type * from "./types/quizzes.types";
