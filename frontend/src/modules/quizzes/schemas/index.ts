/**
 * Quiz Schemas - Barrel Export
 *
 * Central export point for all quiz validation schemas and helpers.
 */

export {
    // Schemas
    questionCreateSchema,
    quizCreateSchema,
    quizUpdateSchema,
    answerSubmitSchema,
    answersSubmitSchema,

    // Types
    type QuestionCreateInput,
    type QuizCreateInput,
    type QuizUpdateInput,
    type AnswerSubmitInput,
    type AnswersSubmitInput,

    // Helpers
    validateQuiz,
    validateQuestion,
    requiresOptions,
    getDefaultOptions,
    calculateTotalPoints,
    suggestDifficulty,
} from './quizSchema';
