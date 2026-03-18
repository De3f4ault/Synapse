/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnswerSubmit } from '../models/AnswerSubmit';
import type { ContextForWeaknessResponse } from '../models/ContextForWeaknessResponse';
import type { DueQuestionsResponse } from '../models/DueQuestionsResponse';
import type { QuizAttemptResume } from '../models/QuizAttemptResume';
import type { QuizAttemptStart } from '../models/QuizAttemptStart';
import type { QuizCreate } from '../models/QuizCreate';
import type { QuizGenerateRequest } from '../models/QuizGenerateRequest';
import type { QuizGenerateResponse } from '../models/QuizGenerateResponse';
import type { QuizInsightsResponse } from '../models/QuizInsightsResponse';
import type { QuizResponse } from '../models/QuizResponse';
import type { QuizResultResponse } from '../models/QuizResultResponse';
import type { RelatedFlashcardsResponse } from '../models/RelatedFlashcardsResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class QuizzesService {
    /**
     * Get Due Questions
     * Get questions due for SM-2 review.
     * @param quizId Filter to specific quiz
     * @param limit Max questions to return
     * @param biasByWeakness Reorder by proximity to weak areas
     * @param token Auth token for image/file requests
     * @returns DueQuestionsResponse Successful Response
     * @throws ApiError
     */
    public static getDueQuestionsApiV1QuizzesDueQuestionsGet(
        quizId?: (number | null),
        limit: number = 20,
        biasByWeakness: boolean = false,
        token?: (string | null),
    ): CancelablePromise<DueQuestionsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes/due-questions',
            query: {
                'quiz_id': quizId,
                'limit': limit,
                'bias_by_weakness': biasByWeakness,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Quiz
     * Create a new quiz with questions.
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns QuizResponse Successful Response
     * @throws ApiError
     */
    public static createQuizApiV1QuizzesPost(
        requestBody: QuizCreate,
        token?: (string | null),
    ): CancelablePromise<QuizResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes',
            query: {
                'token': token,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Quizzes
     * List user's quizzes with question counts.
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns QuizResponse Successful Response
     * @throws ApiError
     */
    public static listQuizzesApiV1QuizzesGet(
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<QuizResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes',
            query: {
                'page': page,
                'page_size': pageSize,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Quiz
     * Generate a quiz using AI.
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns QuizGenerateResponse Successful Response
     * @throws ApiError
     */
    public static generateQuizApiV1QuizzesGeneratePost(
        requestBody: QuizGenerateRequest,
        token?: (string | null),
    ): CancelablePromise<QuizGenerateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes/generate',
            query: {
                'token': token,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Start Quiz Attempt
     * Start a new quiz attempt.
     * @param quizId
     * @param token Auth token for image/file requests
     * @returns QuizAttemptStart Successful Response
     * @throws ApiError
     */
    public static startQuizAttemptApiV1QuizzesQuizIdStartPost(
        quizId: number,
        token?: (string | null),
    ): CancelablePromise<QuizAttemptStart> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes/{quiz_id}/start',
            path: {
                'quiz_id': quizId,
            },
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Submit Quiz Attempt
     * Submit quiz answers and get results.
     * @param attemptId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns QuizResultResponse Successful Response
     * @throws ApiError
     */
    public static submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost(
        attemptId: number,
        requestBody: Array<AnswerSubmit>,
        token?: (string | null),
    ): CancelablePromise<QuizResultResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes/attempts/{attempt_id}/submit',
            path: {
                'attempt_id': attemptId,
            },
            query: {
                'token': token,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Quiz Attempt
     * Retrieve a completed quiz attempt's results.
     * @param attemptId
     * @param token Auth token for image/file requests
     * @returns QuizResultResponse Successful Response
     * @throws ApiError
     */
    public static getQuizAttemptApiV1QuizzesAttemptsAttemptIdGet(
        attemptId: number,
        token?: (string | null),
    ): CancelablePromise<QuizResultResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes/attempts/{attempt_id}',
            path: {
                'attempt_id': attemptId,
            },
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Quiz Attempt Insights
     * Get AI-generated insights for a completed quiz attempt.
     * @param attemptId
     * @param token Auth token for image/file requests
     * @returns QuizInsightsResponse Successful Response
     * @throws ApiError
     */
    public static getQuizAttemptInsightsApiV1QuizzesAttemptsAttemptIdInsightsGet(
        attemptId: number,
        token?: (string | null),
    ): CancelablePromise<QuizInsightsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes/attempts/{attempt_id}/insights',
            path: {
                'attempt_id': attemptId,
            },
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Active Attempt
     * Check if there's an active (incomplete) attempt for this quiz.
     * @param quizId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getActiveAttemptApiV1QuizzesQuizIdActiveGet(
        quizId: number,
        token?: (string | null),
    ): CancelablePromise<(number | null)> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes/{quiz_id}/active',
            path: {
                'quiz_id': quizId,
            },
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Resume Quiz Attempt
     * Resume an in-progress quiz attempt.
     * @param attemptId
     * @param token Auth token for image/file requests
     * @returns QuizAttemptResume Successful Response
     * @throws ApiError
     */
    public static resumeQuizAttemptApiV1QuizzesAttemptsAttemptIdResumeGet(
        attemptId: number,
        token?: (string | null),
    ): CancelablePromise<QuizAttemptResume> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes/attempts/{attempt_id}/resume',
            path: {
                'attempt_id': attemptId,
            },
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Save Partial Answers
     * Save partial answers without submitting.
     * @param attemptId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static savePartialAnswersApiV1QuizzesAttemptsAttemptIdSavePost(
        attemptId: number,
        requestBody: Array<AnswerSubmit>,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes/attempts/{attempt_id}/save',
            path: {
                'attempt_id': attemptId,
            },
            query: {
                'token': token,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Related Flashcards
     * Surface flashcards semantically close to a quiz question (advisory only).
     * @param questionId
     * @param limit
     * @param token Auth token for image/file requests
     * @returns RelatedFlashcardsResponse Successful Response
     * @throws ApiError
     */
    public static getRelatedFlashcardsApiV1QuizzesQuestionsQuestionIdRelatedFlashcardsGet(
        questionId: number,
        limit: number = 5,
        token?: (string | null),
    ): CancelablePromise<RelatedFlashcardsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes/questions/{question_id}/related-flashcards',
            path: {
                'question_id': questionId,
            },
            query: {
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Context For Weakness
     * Surface notes related to recent low-quality quiz attempts (advisory only).
     * @param lookbackDays
     * @param limit
     * @param token Auth token for image/file requests
     * @returns ContextForWeaknessResponse Successful Response
     * @throws ApiError
     */
    public static getContextForWeaknessApiV1QuizzesLearningContextForWeaknessGet(
        lookbackDays: number = 7,
        limit: number = 3,
        token?: (string | null),
    ): CancelablePromise<ContextForWeaknessResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes/learning/context-for-weakness',
            query: {
                'lookback_days': lookbackDays,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
