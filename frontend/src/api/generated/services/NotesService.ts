/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JournalDateResponse } from '../models/JournalDateResponse';
import type { MessageResponse } from '../models/MessageResponse';
import type { NoteCreate } from '../models/NoteCreate';
import type { NoteResponse } from '../models/NoteResponse';
import type { NoteSearchResult } from '../models/NoteSearchResult';
import type { NoteTreeResponse } from '../models/NoteTreeResponse';
import type { NoteUpdate } from '../models/NoteUpdate';
import type { NoteVersionResponse } from '../models/NoteVersionResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class NotesService {
    /**
     * List notes
     * Retrieve user's notes with pagination and filtering
     * @param parentId Filter by parent (NULL for root notes)
     * @param tags Filter by tags (comma-separated)
     * @param isFavorite Filter by favorite status
     * @param isArchived Filter by archived status
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns NoteResponse Successful Response
     * @throws ApiError
     */
    public static listNotesApiV1NotesGet(
        parentId?: (number | null),
        tags?: (string | null),
        isFavorite?: (boolean | null),
        isArchived?: (boolean | null),
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<NoteResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notes',
            query: {
                'parent_id': parentId,
                'tags': tags,
                'is_favorite': isFavorite,
                'is_archived': isArchived,
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
     * Create note
     * Create a new note with optional parent for hierarchy
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns NoteResponse Successful Response
     * @throws ApiError
     */
    public static createNoteApiV1NotesPost(
        requestBody: NoteCreate,
        token?: (string | null),
    ): CancelablePromise<NoteResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/notes',
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
     * Get note hierarchy
     * Retrieve hierarchical note structure as tree
     * @param rootId Start from specific note (NULL for roots)
     * @param token Auth token for image/file requests
     * @returns NoteTreeResponse Successful Response
     * @throws ApiError
     */
    public static getNoteTreeApiV1NotesTreeGet(
        rootId?: (number | null),
        token?: (string | null),
    ): CancelablePromise<Array<NoteTreeResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notes/tree',
            query: {
                'root_id': rootId,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Search notes
     * Full-text search across notes (title and content)
     * @param query Search query
     * @param limit Maximum results
     * @param token Auth token for image/file requests
     * @returns NoteSearchResult Successful Response
     * @throws ApiError
     */
    public static searchNotesApiV1NotesSearchGet(
        query: string,
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<NoteSearchResult>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notes/search',
            query: {
                'query': query,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get note
     * Retrieve a specific note by ID
     * @param noteId
     * @param token Auth token for image/file requests
     * @returns NoteResponse Successful Response
     * @throws ApiError
     */
    public static getNoteApiV1NotesNoteIdGet(
        noteId: number,
        token?: (string | null),
    ): CancelablePromise<NoteResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notes/{note_id}',
            path: {
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
     * Update note
     * Update note and create new version
     * @param noteId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns NoteResponse Successful Response
     * @throws ApiError
     */
    public static updateNoteApiV1NotesNoteIdPut(
        noteId: number,
        requestBody: NoteUpdate,
        token?: (string | null),
    ): CancelablePromise<NoteResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/notes/{note_id}',
            path: {
                'note_id': noteId,
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
     * Delete note
     * Soft delete note and all children
     * @param noteId
     * @param token Auth token for image/file requests
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteNoteApiV1NotesNoteIdDelete(
        noteId: number,
        token?: (string | null),
    ): CancelablePromise<MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/notes/{note_id}',
            path: {
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
     * Get note versions
     * Retrieve version history for a note
     * @param noteId
     * @param token Auth token for image/file requests
     * @returns NoteVersionResponse Successful Response
     * @throws ApiError
     */
    public static getNoteVersionsApiV1NotesNoteIdVersionsGet(
        noteId: number,
        token?: (string | null),
    ): CancelablePromise<Array<NoteVersionResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notes/{note_id}/versions',
            path: {
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
     * List journal dates
     * Get all dates that have journal entries
     * @param token Auth token for image/file requests
     * @returns JournalDateResponse Successful Response
     * @throws ApiError
     */
    public static listJournalDatesApiV1NotesJournalsDatesGet(
        token?: (string | null),
    ): CancelablePromise<Array<JournalDateResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notes/journals/dates',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get or create journal
     * Get journal for a specific date, creating if it doesn't exist
     * @param date
     * @param token Auth token for image/file requests
     * @returns NoteResponse Successful Response
     * @throws ApiError
     */
    public static getOrCreateJournalApiV1NotesJournalsDateGet(
        date: string,
        token?: (string | null),
    ): CancelablePromise<NoteResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/notes/journals/{date}',
            path: {
                'date': date,
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
