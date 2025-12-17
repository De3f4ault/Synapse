/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__documents__MessageResponse } from '../models/app__api__rest__documents__MessageResponse';
import type { Body_upload_document_api_v1_documents_upload_post } from '../models/Body_upload_document_api_v1_documents_upload_post';
import type { DocumentChunkResponse } from '../models/DocumentChunkResponse';
import type { DocumentResponse } from '../models/DocumentResponse';
import type { ProcessingStatus } from '../models/ProcessingStatus';
import type { ProcessingStatusResponse } from '../models/ProcessingStatusResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DocumentsService {
    /**
     * Upload document
     * Upload a document for processing (PDF, DOCX, TXT, MD, EPUB)
     * @param formData
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static uploadDocumentApiV1DocumentsUploadPost(
        formData: Body_upload_document_api_v1_documents_upload_post,
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/documents/upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List documents
     * Retrieve user's uploaded documents
     * @param statusFilter Filter by processing status
     * @param page Page number
     * @param pageSize Items per page
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static listDocumentsApiV1DocumentsGet(
        statusFilter?: (ProcessingStatus | null),
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<Array<DocumentResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents',
            query: {
                'status_filter': statusFilter,
                'page': page,
                'page_size': pageSize,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get document
     * Retrieve a specific document by ID
     * @param documentId
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static getDocumentApiV1DocumentsDocumentIdGet(
        documentId: number,
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete document
     * Delete a document and all its chunks
     * @param documentId
     * @param deleteFile Also delete physical file from storage
     * @returns app__api__rest__documents__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteDocumentApiV1DocumentsDocumentIdDelete(
        documentId: number,
        deleteFile: boolean = false,
    ): CancelablePromise<app__api__rest__documents__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/documents/{document_id}',
            path: {
                'document_id': documentId,
            },
            query: {
                'delete_file': deleteFile,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get document chunks
     * Retrieve all chunks for a document
     * @param documentId
     * @param page Page number
     * @param pageSize Chunks per page
     * @returns DocumentChunkResponse Successful Response
     * @throws ApiError
     */
    public static getDocumentChunksApiV1DocumentsDocumentIdChunksGet(
        documentId: number,
        page: number = 1,
        pageSize: number = 50,
    ): CancelablePromise<Array<DocumentChunkResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}/chunks',
            path: {
                'document_id': documentId,
            },
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
     * Get processing status
     * Check document processing status and progress
     * @param documentId
     * @returns ProcessingStatusResponse Successful Response
     * @throws ApiError
     */
    public static getProcessingStatusApiV1DocumentsDocumentIdStatusGet(
        documentId: number,
    ): CancelablePromise<ProcessingStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}/status',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Trigger processing
     * Manually trigger document processing (if pending or failed)
     * @param documentId
     * @returns app__api__rest__documents__MessageResponse Successful Response
     * @throws ApiError
     */
    public static triggerProcessingApiV1DocumentsDocumentIdProcessPost(
        documentId: number,
    ): CancelablePromise<app__api__rest__documents__MessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/documents/{document_id}/process',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
