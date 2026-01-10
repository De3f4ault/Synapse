/**
 * Quiz Module - Core Types
 *
 * Canonical domain types for the Quiz learning engine.
 * These are NOT UI types - they represent the core domain model.
 */

// ============================================================================
// Identifiers
// ============================================================================

export type QuizId = number;
export type AttemptId = number;
export type QuestionId = number;

// ============================================================================
// Enums (aligned with backend)
// ============================================================================

export enum QuizDifficulty {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
}

export enum QuestionType {
    MULTIPLE_CHOICE = "multiple_choice",
    TRUE_FALSE = "true_false",
    SHORT_ANSWER = "short_answer",
}

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * A quiz as returned from the API list endpoint.
 */
export interface Quiz {
    id: QuizId;
    title: string;
    description: string | null;
    difficulty: QuizDifficulty;
    timeLimitMinutes: number | null;
    questionCount: number;
    userId: number;
    createdAt: string;
}

/**
 * A question within a quiz attempt.
 * Includes answer data for real-time feedback during attempt.
 */
export interface QuizQuestion {
    id: QuestionId;
    questionText: string;
    questionType: QuestionType;
    options: Record<string, string> | null;
    points: number;
    order: number;
    correctAnswer: string;
    explanation: string | null;
}

/**
 * Data returned when starting a quiz attempt.
 */
export interface QuizAttemptData {
    attemptId: AttemptId;
    quizId: QuizId;
    startedAt: string;
    questions: QuizQuestion[];
}

/**
 * Individual answer result after submission.
 */
export interface AnswerResult {
    questionId: QuestionId;
    questionText: string;
    yourAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string | null;
    pointsEarned: number;
}

/**
 * Complete quiz result after submission.
 */
export interface QuizResult {
    attemptId: AttemptId;
    score: number;
    maxScore: number;
    percentage: number;
    timeTakenSeconds: number;
    answers: AnswerResult[];
}

/**
 * AI-generated insights for a completed attempt.
 */
export interface QuizInsights {
    attemptId: AttemptId;
    summary: string;
    weakAreas: string[];
    recommendations: string[];
    generatedAt: string;
}

// ============================================================================
// UI State Types (derived from domain)
// ============================================================================

/**
 * Local state for tracking answers during an active attempt.
 */
export interface LocalQuestionState {
    answered: boolean;
    selectedAnswer: string | null;
    isCorrect: boolean | null;
    showExplanation: boolean;
}

/**
 * Performance summary for results display.
 */
export interface QuizPerformance {
    score: number;
    percentage: number;
    rank: {
        grade: string;
        color: string;
        bg: string;
    };
    duration: number;
    correctCount: number;
    totalCount: number;
}

// ============================================================================
// Error Taxonomy
// ============================================================================

/**
 * Domain-specific error codes for quiz operations.
 * Used for consistent error handling across the module.
 */
export type QuizErrorCode =
    | "ATTEMPT_NOT_FOUND"
    | "ATTEMPT_EXPIRED"
    | "ATTEMPT_ALREADY_SUBMITTED"
    | "INVALID_STATE_TRANSITION"
    | "SUBMISSION_FAILED"
    | "RESUME_FAILED"
    | "START_FAILED"
    | "INSIGHTS_UNAVAILABLE"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";

/**
 * Structured error for quiz operations.
 */
export interface QuizError {
    code: QuizErrorCode;
    message: string;
    recoverable: boolean;
    details?: unknown;
}

/**
 * Create a structured quiz error.
 */
export function createQuizError(
    code: QuizErrorCode,
    message: string,
    recoverable = true,
    details?: unknown
): QuizError {
    return { code, message, recoverable, details };
}

