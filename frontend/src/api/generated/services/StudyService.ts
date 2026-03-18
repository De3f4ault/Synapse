/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StudyItemResponse } from '../models/StudyItemResponse';
import type { StudySessionCreate } from '../models/StudySessionCreate';
import type { StudySessionResponse } from '../models/StudySessionResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudyService {
    /**
     * Get Due Items
     * Get all due items across modules.
     *
     * Aggregates items from different learning modules (flashcards, quizzes)
     * that need review, prioritized by due date and performance.
     * @param modules Comma-separated modules
     * @param limit
     * @param token Auth token for image/file requests
     * @returns StudyItemResponse Successful Response
     * @throws ApiError
     */
    public static getDueItemsApiV1StudyDueGet(
        modules: string = 'flashcards,quizzes',
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<StudyItemResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/study/due',
            query: {
                'modules': modules,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Start Session
     * Start a new study session.
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns StudySessionResponse Successful Response
     * @throws ApiError
     */
    public static startSessionApiV1StudySessionsPost(
        requestBody: StudySessionCreate,
        token?: (string | null),
    ): CancelablePromise<StudySessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/study/sessions',
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
     * List Sessions
     * List user's study sessions with pagination.
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns StudySessionResponse Successful Response
     * @throws ApiError
     */
    public static listSessionsApiV1StudySessionsGet(
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<StudySessionResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/study/sessions',
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
     * Get Session
     * Get a specific study session.
     * @param sessionId
     * @param token Auth token for image/file requests
     * @returns StudySessionResponse Successful Response
     * @throws ApiError
     */
    public static getSessionApiV1StudySessionsSessionIdGet(
        sessionId: number,
        token?: (string | null),
    ): CancelablePromise<StudySessionResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/study/sessions/{session_id}',
            path: {
                'session_id': sessionId,
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
     * Complete Session
     * Complete a study session.
     * @param sessionId
     * @param token Auth token for image/file requests
     * @returns StudySessionResponse Successful Response
     * @throws ApiError
     */
    public static completeSessionApiV1StudySessionsSessionIdCompletePost(
        sessionId: number,
        token?: (string | null),
    ): CancelablePromise<StudySessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/study/sessions/{session_id}/complete',
            path: {
                'session_id': sessionId,
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
     * Get Recommendations
     * Get AI-powered study recommendations.
     *
     * Recommends items based on weak areas, review patterns, and learning goals.
     * Combines flashcards and quizzes, prioritizing high-value items.
     * @param limit
     * @param token Auth token for image/file requests
     * @returns StudyItemResponse Successful Response
     * @throws ApiError
     */
    public static getRecommendationsApiV1StudyRecommendationsGet(
        limit: number = 10,
        token?: (string | null),
    ): CancelablePromise<Array<StudyItemResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/study/recommendations',
            query: {
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
