/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckpointRequest } from '../models/CheckpointRequest';
import type { CreateSessionV2Request } from '../models/CreateSessionV2Request';
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
    /**
     * Create a curated session with a queue snapshot
     * Create a study session with a budgeted, prioritised card queue.
     *
     * The queue is snapshotted at creation — resuming always returns the
     * same card set the student started with, even if new cards become due.
     *
     * Returns the session with a `queue` array containing the full card data.
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static createCuratedSessionApiV1StudySessionsCuratedPost(
        requestBody: CreateSessionV2Request,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/study/sessions/curated',
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
     * Save current position in an active session
     * Persist the current card index and optional per-card review detail.
     *
     * Called after every card is reviewed so the session can be resumed
     * at the exact card the student left off on. Lightweight — just an
     * index update + JSON append.
     * @param sessionId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static checkpointSessionApiV1StudySessionsSessionIdCheckpointPatch(
        sessionId: number,
        requestBody: CheckpointRequest,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/study/sessions/{session_id}/checkpoint',
            path: {
                'session_id': sessionId,
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
     * Complete a session (v2 — uses resume_status)
     * Mark a session as completed.
     *
     * Uses resume_status field (not the v1 is_completed approach) so the
     * active-sessions endpoint correctly excludes this session from the
     * resume prompt.
     * @param sessionId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static completeSessionV2ApiV1StudySessionsSessionIdCompleteV2Post(
        sessionId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/study/sessions/{session_id}/complete-v2',
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
     * Abandon a session (user quit mid-session)
     * Mark a session as abandoned.
     *
     * Abandoned sessions surface in 'Not Completed' on the dashboard.
     * They remain resumable — the student can pick up where they left off.
     * @param sessionId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static abandonSessionApiV1StudySessionsSessionIdAbandonPost(
        sessionId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/study/sessions/{session_id}/abandon',
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
     * Get resumable sessions for the current user
     * Return sessions that are resumable (in_progress or recently abandoned).
     *
     * The frontend uses this to surface "Continue where you left off?" prompts.
     *
     * Returns up to 5 sessions ordered by last_activity_at DESC.
     * Enriched with deck_name and progress percentage.
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getActiveSessionsApiV1StudySessionsActiveGet(
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/study/sessions/active',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
