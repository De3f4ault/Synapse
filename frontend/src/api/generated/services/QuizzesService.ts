/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnswerSubmit } from '../models/AnswerSubmit';
import type { QuizAttemptStart } from '../models/QuizAttemptStart';
import type { QuizCreate } from '../models/QuizCreate';
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
     * @returns QuizResponse Successful Response
     * @throws ApiError
     */
    public static createQuizApiV1QuizzesPost(
        requestBody: QuizCreate,
    ): CancelablePromise<QuizResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Quizzes
     * List user's quizzes.
     * @param page
     * @param pageSize
     * @returns QuizResponse Successful Response
     * @throws ApiError
     */
    public static listQuizzesApiV1QuizzesGet(
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<Array<QuizResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/quizzes',
            query: {
                'page': page,
                'page_size': pageSize,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Start Quiz Attempt
     * Start a new quiz attempt.
     * @param quizId
     * @returns QuizAttemptStart Successful Response
     * @throws ApiError
     */
    public static startQuizAttemptApiV1QuizzesQuizIdStartPost(
        quizId: number,
    ): CancelablePromise<QuizAttemptStart> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes/{quiz_id}/start',
            path: {
                'quiz_id': quizId,
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
     * @returns QuizResultResponse Successful Response
     * @throws ApiError
     */
    public static submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost(
        attemptId: number,
        requestBody: Array<AnswerSubmit>,
    ): CancelablePromise<QuizResultResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/quizzes/attempts/{attempt_id}/submit',
            path: {
                'attempt_id': attemptId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
