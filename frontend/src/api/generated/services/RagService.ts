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
     * @returns DocumentIngestResponse Successful Response
     * @throws ApiError
     */
    public static ingestDocumentApiV1RagDocumentsIngestPost(
        requestBody: DocumentIngestRequest,
    ): CancelablePromise<DocumentIngestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/documents/ingest',
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
     * @returns BatchIngestResponse Successful Response
     * @throws ApiError
     */
    public static batchIngestApiV1RagDocumentsBatchPost(
        requestBody: BatchIngestRequest,
    ): CancelablePromise<BatchIngestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/documents/batch',
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
     * @returns QueryResponse Successful Response
     * @throws ApiError
     */
    public static queryRagApiV1RagQueryPost(
        requestBody: QueryRequest,
    ): CancelablePromise<QueryResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/query',
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
     * @returns FeedbackResponse Successful Response
     * @throws ApiError
     */
    public static submitFeedbackApiV1RagFeedbackPost(
        requestBody: FeedbackRequest,
    ): CancelablePromise<FeedbackResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/rag/feedback',
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
     * @returns TaskStatusResponse Successful Response
     * @throws ApiError
     */
    public static getTaskStatusApiV1RagTasksTaskIdGet(
        taskId: string,
    ): CancelablePromise<TaskStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/rag/tasks/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
