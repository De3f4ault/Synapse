/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__uploads__MessageResponse } from '../models/app__api__rest__uploads__MessageResponse';
import type { Body_replace_document_api_v1_documents__document_id__replace_put } from '../models/Body_replace_document_api_v1_documents__document_id__replace_put';
import type { Body_upload_document_api_v1_documents_upload_post } from '../models/Body_upload_document_api_v1_documents_upload_post';
import type { DocumentChunkResponse } from '../models/DocumentChunkResponse';
import type { DocumentResponse } from '../models/DocumentResponse';
import type { DocumentUpdateRequest } from '../models/DocumentUpdateRequest';
import type { MoveDocumentRequest } from '../models/MoveDocumentRequest';
import type { ProcessingStatus } from '../models/ProcessingStatus';
import type { ProcessingStatusResponse } from '../models/ProcessingStatusResponse';
import type { SummaryResponse } from '../models/SummaryResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DocumentsService {
    /**
     * Upload document
     * Upload a document for processing (PDF, DOCX, TXT, MD, EPUB)
     * @param formData
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static uploadDocumentApiV1DocumentsUploadPost(
        formData: Body_upload_document_api_v1_documents_upload_post,
        token?: (string | null),
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/documents/upload',
            query: {
                'token': token,
            },
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
     * @param folderId Filter by folder ID (null = root/unfiled documents)
     * @param includeAll If true, return all documents ignoring folder filter
     * @param view Smart view filter: 'recent', 'favorites', or 'archived'
     * @param statusFilter Filter by processing status
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static listDocumentsApiV1DocumentsGet(
        folderId?: (number | null),
        includeAll: boolean = false,
        view?: (string | null),
        statusFilter?: (ProcessingStatus | null),
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<DocumentResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents',
            query: {
                'folder_id': folderId,
                'include_all': includeAll,
                'view': view,
                'status_filter': statusFilter,
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
     * Get document
     * Retrieve a specific document by ID
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static getDocumentApiV1DocumentsDocumentIdGet(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}',
            path: {
                'document_id': documentId,
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
     * Delete document
     * Delete a document and all its chunks
     * @param documentId
     * @param keepFile Keep physical file on disk (default: delete it)
     * @param token Auth token for image/file requests
     * @returns app__api__rest__uploads__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteDocumentApiV1DocumentsDocumentIdDelete(
        documentId: number,
        keepFile: boolean = false,
        token?: (string | null),
    ): CancelablePromise<app__api__rest__uploads__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/documents/{document_id}',
            path: {
                'document_id': documentId,
            },
            query: {
                'keep_file': keepFile,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update document metadata
     * Update sector, notes, or reading progress for a document
     * @param documentId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static updateDocumentApiV1DocumentsDocumentIdPatch(
        documentId: number,
        requestBody: DocumentUpdateRequest,
        token?: (string | null),
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/documents/{document_id}',
            path: {
                'document_id': documentId,
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
     * Replace document
     * Replace an existing document's file while preserving its ID and metadata
     * @param documentId
     * @param formData
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static replaceDocumentApiV1DocumentsDocumentIdReplacePut(
        documentId: number,
        formData: Body_replace_document_api_v1_documents__document_id__replace_put,
        token?: (string | null),
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/documents/{document_id}/replace',
            path: {
                'document_id': documentId,
            },
            query: {
                'token': token,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
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
     * @param token Auth token for image/file requests
     * @returns DocumentChunkResponse Successful Response
     * @throws ApiError
     */
    public static getDocumentChunksApiV1DocumentsDocumentIdChunksGet(
        documentId: number,
        page: number = 1,
        pageSize: number = 50,
        token?: (string | null),
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
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns ProcessingStatusResponse Successful Response
     * @throws ApiError
     */
    public static getProcessingStatusApiV1DocumentsDocumentIdStatusGet(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<ProcessingStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}/status',
            path: {
                'document_id': documentId,
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
     * Trigger processing
     * Manually trigger document processing (if pending or failed)
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns app__api__rest__uploads__MessageResponse Successful Response
     * @throws ApiError
     */
    public static triggerProcessingApiV1DocumentsDocumentIdProcessPost(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<app__api__rest__uploads__MessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/documents/{document_id}/process',
            path: {
                'document_id': documentId,
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
     * Get document content
     * Stream the raw document file (inline viewing)
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getDocumentContentApiV1DocumentsDocumentIdContentGet(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}/content',
            path: {
                'document_id': documentId,
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
     * Get document thumbnail
     * Get a visual thumbnail/cover image for the document
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getDocumentThumbnailApiV1DocumentsDocumentIdThumbGet(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}/thumb',
            path: {
                'document_id': documentId,
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
     * Get multiple document thumbnails
     * Fetch thumbnails for multiple documents in a single request. Returns base64-encoded PNGs.
     * @param ids Comma-separated document IDs
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getBatchThumbnailsApiV1DocumentsBatchThumbsGet(
        ids: string,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/batch/thumbs',
            query: {
                'ids': ids,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Move document
     * Move a document to a different folder
     * @param documentId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static moveDocumentApiV1DocumentsDocumentIdMovePatch(
        documentId: number,
        requestBody: MoveDocumentRequest,
        token?: (string | null),
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/documents/{document_id}/move',
            path: {
                'document_id': documentId,
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
     * Generate AI summary
     * Generate or retrieve cached AI summary for a document
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns SummaryResponse Successful Response
     * @throws ApiError
     */
    public static generateDocumentSummaryApiV1DocumentsDocumentIdSummaryPost(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<SummaryResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/documents/{document_id}/summary',
            path: {
                'document_id': documentId,
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
