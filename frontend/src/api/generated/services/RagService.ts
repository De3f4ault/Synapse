/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BatchIngestRequest } from '../models/BatchIngestRequest';
import type { BatchIngestResponse } from '../models/BatchIngestResponse';
import type { DocumentIngestRequest } from '../models/DocumentIngestRequest';
import type { DocumentIngestResponse } from '../models/DocumentIngestResponse';
import type { FeedbackRequest } from '../models/FeedbackRequest';
import type { FeedbackResponse } from '../models/FeedbackResponse';
import type { QueryRequest } from '../models/QueryRequest';
import type { QueryResponse } from '../models/QueryResponse';
import type { TaskStatusResponse } from '../models/TaskStatusResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RagService {
    /**
     * Ingest document into RAG
     * Ingest document with smart routing: small docs processed inline, large docs queued to Celery
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns DocumentIngestResponse Successful Response
     * @throws ApiError
     */
    public static ingestDocumentApiV1RagDocumentsIngestPost(
        requestBody: DocumentIngestRequest,
        token?: (string | null),
    ): CancelablePromise<DocumentIngestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/documents/ingest',
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
     * Batch ingest documents
     * Batch ingest multiple documents (always async via Celery).
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns BatchIngestResponse Successful Response
     * @throws ApiError
     */
    public static batchIngestApiV1RagDocumentsBatchPost(
        requestBody: BatchIngestRequest,
        token?: (string | null),
    ): CancelablePromise<BatchIngestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/documents/batch',
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
     * Query RAG system
     * Query RAG with all Phase 3 enhancements (LLM, reranking, personalization)
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns QueryResponse Successful Response
     * @throws ApiError
     */
    public static queryRagApiV1RagQueryPost(
        requestBody: QueryRequest,
        token?: (string | null),
    ): CancelablePromise<QueryResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/query',
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
     * Submit feedback
     * Submit user feedback for adaptive learning
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns FeedbackResponse Successful Response
     * @throws ApiError
     */
    public static submitFeedbackApiV1RagFeedbackPost(
        requestBody: FeedbackRequest,
        token?: (string | null),
    ): CancelablePromise<FeedbackResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/feedback',
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
     * Get task status
     * Get status of background task.
     * @param taskId
     * @param token Auth token for image/file requests
     * @returns TaskStatusResponse Successful Response
     * @throws ApiError
     */
    public static getTaskStatusApiV1RagTasksTaskIdGet(
        taskId: string,
        token?: (string | null),
    ): CancelablePromise<TaskStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/rag/tasks/{task_id}',
            path: {
                'task_id': taskId,
            },
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
