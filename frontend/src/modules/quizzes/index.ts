/**
 * Quizzes Module - Public API
 *
 * This is the entry point for the quizzes learning engine.
 * Import from here, not from submodules directly.
 */

// Core (types, constants, lifecycle)
export * from "./core";

// Hub (discovery, creation)
export { QuizHub, QuizCard, QuizGenerator, useQuizHub } from "./hub";

// Attempt (active quiz engine)
export { QuizSession, useQuizAttempt, ProgressBar, QuestionRenderer } from "./attempt";

// Results (post-attempt)
export {
    QuizResults,
    ResultsSummary,
    QuestionReview,
    AIInsights,
    useQuizResults,
} from "./results";
