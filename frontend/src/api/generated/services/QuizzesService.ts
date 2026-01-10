/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnswerSubmit } from '../models/AnswerSubmit';
import type { QuizAttemptResume } from '../models/QuizAttemptResume';
import type { QuizAttemptStart } from '../models/QuizAttemptStart';
import type { QuizCreate } from '../models/QuizCreate';
import type { QuizGenerateRequest } from '../models/QuizGenerateRequest';
import type { QuizGenerateResponse } from '../models/QuizGenerateResponse';
import type { QuizInsightsResponse } from '../models/QuizInsightsResponse';
import type { QuizResponse } from '../models/QuizResponse';
import type { QuizResultResponse } from '../models/QuizResultResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class QuizzesService {
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
     * List user's quizzes with question counts (optimized - single query).
     * @param page
     * @param pageSize
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
     * Generate quiz with AI
     * Use AI to generate a quiz from a topic or document
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
     *
     * This endpoint allows fetching results for a previously completed attempt,
     * enabling refresh-safe results pages and historical review.
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
     *
     * Analyzes performance patterns and provides actionable recommendations.
     * Currently returns a basic analysis; will be enhanced with full AI integration.
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
     *
     * Returns the attempt_id if one exists, null otherwise.
     * Used by frontend to decide whether to start new or resume.
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
     *
     * Returns questions, partial answers, and timing info.
     * Allows frontend to rehydrate state after page refresh.
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
     *
     * Enables resume functionality by persisting progress.
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
}
