/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnswerSubmit } from '../models/AnswerSubmit';
import type { QuizAttemptStart } from '../models/QuizAttemptStart';
import type { QuizCreate } from '../models/QuizCreate';
import type { QuizGenerateRequest } from '../models/QuizGenerateRequest';
import type { QuizGenerateResponse } from '../models/QuizGenerateResponse';
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
}
