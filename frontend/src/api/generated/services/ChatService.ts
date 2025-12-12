/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AIModelResponse } from '../models/AIModelResponse';
import type { Body_upload_chat_file_api_v1_chat_files_upload_post } from '../models/Body_upload_chat_file_api_v1_chat_files_upload_post';
import type { ChatMessageCreate } from '../models/ChatMessageCreate';
import type { ChatMessageResponse } from '../models/ChatMessageResponse';
import type { ChatSessionCreate } from '../models/ChatSessionCreate';
import type { ChatSessionResponse } from '../models/ChatSessionResponse';
import type { FileUploadResponse } from '../models/FileUploadResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatService {
    /**
     * List chat sessions
     * Retrieve user's chat sessions
     * @param page Page number
     * @param pageSize Items per page
     * @returns ChatSessionResponse Successful Response
     * @throws ApiError
     */
    public static listSessionsApiV1ChatSessionsGet(
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<Array<ChatSessionResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions',
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
     * Create chat session
     * Start a new chat session
     * @param requestBody
     * @returns ChatSessionResponse Successful Response
     * @throws ApiError
     */
    public static createSessionApiV1ChatSessionsPost(
        requestBody: ChatSessionCreate,
    ): CancelablePromise<ChatSessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/sessions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get chat session
     * Retrieve a specific chat session
     * @param sessionId
     * @returns ChatSessionResponse Successful Response
     * @throws ApiError
     */
    public static getSessionApiV1ChatSessionsSessionIdGet(
        sessionId: number,
    ): CancelablePromise<ChatSessionResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete chat session
     * Delete a chat session
     * @param sessionId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteSessionApiV1ChatSessionsSessionIdDelete(
        sessionId: number,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/chat/sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get chat messages
     * Retrieve messages from a chat session
     * @param sessionId
     * @param limit Max messages to return
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static getMessagesApiV1ChatSessionsSessionIdMessagesGet(
        sessionId: number,
        limit: number = 100,
    ): CancelablePromise<Array<ChatMessageResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions/{session_id}/messages',
            path: {
                'session_id': sessionId,
            },
            query: {
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Send chat message
     * Send a message and get AI response (non-streaming)
     * @param sessionId
     * @param requestBody
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static sendMessageApiV1ChatSessionsSessionIdMessagesPost(
        sessionId: number,
        requestBody: ChatMessageCreate,
    ): CancelablePromise<ChatMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/sessions/{session_id}/messages',
            path: {
                'session_id': sessionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete message
     * Delete a specific message
     * @param messageId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteMessageApiV1ChatMessagesMessageIdDelete(
        messageId: number,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/chat/messages/{message_id}',
            path: {
                'message_id': messageId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Regenerate message
     * Regenerate AI response for a message
     * @param messageId
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static regenerateMessageApiV1ChatMessagesMessageIdRegeneratePost(
        messageId: number,
    ): CancelablePromise<ChatMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/messages/{message_id}/regenerate',
            path: {
                'message_id': messageId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload file for chat
     * Upload a file to use as context in chat
     * @param formData
     * @param sessionId
     * @returns FileUploadResponse Successful Response
     * @throws ApiError
     */
    public static uploadChatFileApiV1ChatFilesUploadPost(
        formData: Body_upload_chat_file_api_v1_chat_files_upload_post,
        sessionId?: (number | null),
    ): CancelablePromise<FileUploadResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/files/upload',
            query: {
                'session_id': sessionId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List AI models
     * Get list of available AI models
     * @returns AIModelResponse Successful Response
     * @throws ApiError
     */
    public static listModelsApiV1ChatModelsGet(): CancelablePromise<Array<AIModelResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/models',
        });
    }
}
