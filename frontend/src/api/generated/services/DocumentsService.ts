/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_document_api_v1_documents_upload_post } from '../models/Body_upload_document_api_v1_documents_upload_post';
import type { BulkEditRequest } from '../models/BulkEditRequest';
import type { DocumentChunkResponse } from '../models/DocumentChunkResponse';
import type { DocumentMetadataResponse } from '../models/DocumentMetadataResponse';
import type { DocumentNoteCreate } from '../models/DocumentNoteCreate';
import type { DocumentNoteResponse } from '../models/DocumentNoteResponse';
import type { DocumentResponse } from '../models/DocumentResponse';
import type { DocumentUpdateRequest } from '../models/DocumentUpdateRequest';
import type { MessageResponse } from '../models/MessageResponse';
import type { MoveDocumentRequest } from '../models/MoveDocumentRequest';
import type { ProcessingStatusResponse } from '../models/ProcessingStatusResponse';
import type { RecentActivityItem } from '../models/RecentActivityItem';
import type { StorageBreakdownItem } from '../models/StorageBreakdownItem';
import type { SummaryResponse } from '../models/SummaryResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DocumentsService {
    /**
     * Upload Document
     * Upload a document for processing. Returns 409 Conflict on duplicates.
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
     * Get storage breakdown
     * Per-category storage usage (Images, Videos, Documents, etc.)
     * @param token Auth token for image/file requests
     * @returns StorageBreakdownItem Successful Response
     * @throws ApiError
     */
    public static getStorageBreakdownApiV1DocumentsStorageBreakdownGet(
        token?: (string | null),
    ): CancelablePromise<Array<StorageBreakdownItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/storage-breakdown',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get recent activity
     * Recent user actions (uploaded, modified, favorited)
     * @param limit Max number of items
     * @param token Auth token for image/file requests
     * @returns RecentActivityItem Successful Response
     * @throws ApiError
     */
    public static getRecentActivityApiV1DocumentsRecentActivityGet(
        limit: number = 15,
        token?: (string | null),
    ): CancelablePromise<Array<RecentActivityItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/recent-activity',
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
     * Get DMS statistics
     * Dashboard statistics: document/correspondent/type/tag totals, inbox count, storage.
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getStatisticsApiV1DocumentsStatisticsGet(
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/statistics',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk edit documents
     * Apply an operation to multiple documents at once.
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static bulkEditApiV1DocumentsBulkEditPost(
        requestBody: BulkEditRequest,
        token?: (string | null),
    ): CancelablePromise<MessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/documents/bulk_edit',
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
     * Toggle favorite
     * Toggle is_favorite flag on a document
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static toggleFavoriteApiV1DocumentsDocumentIdFavoritePatch(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<DocumentResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/documents/{document_id}/favorite',
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
     * List Documents
     * List user's documents with folder, smart view, and status filtering.
     * @param folderId Filter by folder ID
     * @param smartView Smart view: recent, favorites, archived
     * @param processingStatus Filter by status
     * @param search Search by filename
     * @param sortBy Sort field
     * @param sortOrder asc or desc
     * @param page
     * @param pageSize
     * @param token Auth token for image/file requests
     * @returns DocumentResponse Successful Response
     * @throws ApiError
     */
    public static listDocumentsApiV1DocumentsGet(
        folderId?: (number | null),
        smartView?: (string | null),
        processingStatus?: (string | null),
        search?: (string | null),
        sortBy?: (string | null),
        sortOrder?: (string | null),
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<DocumentResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents',
            query: {
                'folder_id': folderId,
                'smart_view': smartView,
                'processing_status': processingStatus,
                'search': search,
                'sort_by': sortBy,
                'sort_order': sortOrder,
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
     * Get Document
     * Get a specific document.
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
     * Delete Document
     * Delete a document (soft delete + physical cleanup).
     * @param documentId
     * @param keepFile Keep physical file on disk
     * @param token Auth token for image/file requests
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteDocument(
        documentId: number,
        keepFile: boolean = false,
        token?: (string | null),
    ): CancelablePromise<MessageResponse> {
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
     * Update Document
     * Update document metadata.
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
     * Get Document Chunks
     * Get all chunks for a document.
     * @param documentId
     * @param page
     * @param pageSize
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
     * Get Processing Status
     * Get document processing status.
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
     * Trigger Processing
     * Manually trigger document processing.
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static triggerProcessingApiV1DocumentsDocumentIdProcessPost(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<MessageResponse> {
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
     * List document notes
     * List all notes for a document.
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns DocumentNoteResponse Successful Response
     * @throws ApiError
     */
    public static listDocumentNotesApiV1DocumentsDocumentIdNotesGet(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<Array<DocumentNoteResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}/notes',
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
     * Add a note to a document
     * Create a note on a document. Matching Paperless POST /documents/{id}/notes/.
     * @param documentId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns DocumentNoteResponse Successful Response
     * @throws ApiError
     */
    public static createDocumentNoteApiV1DocumentsDocumentIdNotesPost(
        documentId: number,
        requestBody: DocumentNoteCreate,
        token?: (string | null),
    ): CancelablePromise<DocumentNoteResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/documents/{document_id}/notes',
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
     * Delete a document note
     * Delete a note. Only the author or document owner can delete.
     * @param documentId
     * @param noteId
     * @param token Auth token for image/file requests
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteDocumentNoteApiV1DocumentsDocumentIdNotesNoteIdDelete(
        documentId: number,
        noteId: number,
        token?: (string | null),
    ): CancelablePromise<MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/documents/{document_id}/notes/{note_id}',
            path: {
                'document_id': documentId,
                'note_id': noteId,
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
     * Get document metadata
     * Technical metadata: checksums, MIME type, archive info.
     * @param documentId
     * @param token Auth token for image/file requests
     * @returns DocumentMetadataResponse Successful Response
     * @throws ApiError
     */
    public static getDocumentMetadataApiV1DocumentsDocumentIdMetadataGet(
        documentId: number,
        token?: (string | null),
    ): CancelablePromise<DocumentMetadataResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/documents/{document_id}/metadata',
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
     * Get Document Content
     * Stream the raw document file.
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
     * Get Document Thumbnail
     * Serve the document thumbnail.
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
     * Get Batch Thumbnails
     * Batch fetch document thumbnails (base64).
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
     * Move Document
     * Move a document to a different folder.
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
     * Generate Document Summary
     * Generate or retrieve cached AI summary.
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
