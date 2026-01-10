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
import type { ChatSessionUpdate } from '../models/ChatSessionUpdate';
import type { ConversationSearchResult } from '../models/ConversationSearchResult';
import type { ConversationTreeResponse } from '../models/ConversationTreeResponse';
import type { EditMessageRequest } from '../models/EditMessageRequest';
import type { FileUploadResponse } from '../models/FileUploadResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatService {
    /**
     * Search conversations
     * Production-grade full-text search with fuzzy matching
     * @param q Search query
     * @param limit Max results
     * @param includeInactive Include inactive branch messages
     * @param fuzzy Enable fuzzy/substring matching
     * @param token Auth token for image/file requests
     * @returns ConversationSearchResult Successful Response
     * @throws ApiError
     */
    public static searchConversationsApiV1ChatSearchGet(
        q: string,
        limit: number = 20,
        includeInactive: boolean = false,
        fuzzy: boolean = true,
        token?: (string | null),
    ): CancelablePromise<Array<ConversationSearchResult>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/search',
            query: {
                'q': q,
                'limit': limit,
                'include_inactive': includeInactive,
                'fuzzy': fuzzy,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Search suggestions
     * Get autocomplete suggestions based on conversation content
     * @param q Prefix to autocomplete
     * @param limit Max suggestions
     * @param token Auth token for image/file requests
     * @returns string Successful Response
     * @throws ApiError
     */
    public static searchSuggestionsApiV1ChatSearchSuggestGet(
        q: string,
        limit: number = 10,
        token?: (string | null),
    ): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/search/suggest',
            query: {
                'q': q,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List chat sessions
     * Retrieve user's chat sessions
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns ChatSessionResponse Successful Response
     * @throws ApiError
     */
    public static listSessionsApiV1ChatSessionsGet(
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<ChatSessionResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions',
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
     * Create chat session
     * Start a new chat session
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ChatSessionResponse Successful Response
     * @throws ApiError
     */
    public static createSessionApiV1ChatSessionsPost(
        requestBody: ChatSessionCreate,
        token?: (string | null),
    ): CancelablePromise<ChatSessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/sessions',
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
     * Get chat session
     * Retrieve a specific chat session
     * @param sessionId
     * @param token Auth token for image/file requests
     * @returns ChatSessionResponse Successful Response
     * @throws ApiError
     */
    public static getSessionApiV1ChatSessionsSessionIdGet(
        sessionId: number,
        token?: (string | null),
    ): CancelablePromise<ChatSessionResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions/{session_id}',
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
     * Delete chat session
     * Delete a chat session
     * @param sessionId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteSessionApiV1ChatSessionsSessionIdDelete(
        sessionId: number,
        token?: (string | null),
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/chat/sessions/{session_id}',
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
     * Update chat session
     * Update session title
     * @param sessionId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ChatSessionResponse Successful Response
     * @throws ApiError
     */
    public static updateSessionApiV1ChatSessionsSessionIdPatch(
        sessionId: number,
        requestBody: ChatSessionUpdate,
        token?: (string | null),
    ): CancelablePromise<ChatSessionResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/chat/sessions/{session_id}',
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
     * Get chat messages
     * Retrieve messages from a chat session
     * @param sessionId
     * @param limit Max messages to return
     * @param token Auth token for image/file requests
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static getMessagesApiV1ChatSessionsSessionIdMessagesGet(
        sessionId: number,
        limit: number = 100,
        token?: (string | null),
    ): CancelablePromise<Array<ChatMessageResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions/{session_id}/messages',
            path: {
                'session_id': sessionId,
            },
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
     * Send chat message
     * Send a message and get AI response (non-streaming)
     * @param sessionId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static sendMessageApiV1ChatSessionsSessionIdMessagesPost(
        sessionId: number,
        requestBody: ChatMessageCreate,
        token?: (string | null),
    ): CancelablePromise<ChatMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/sessions/{session_id}/messages',
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
     * Delete message
     * Delete a specific message
     * @param messageId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteMessageApiV1ChatMessagesMessageIdDelete(
        messageId: number,
        token?: (string | null),
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/chat/messages/{message_id}',
            path: {
                'message_id': messageId,
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
     * Regenerate message
     * Regenerate AI response for a message
     * @param messageId
     * @param token Auth token for image/file requests
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static regenerateMessageApiV1ChatMessagesMessageIdRegeneratePost(
        messageId: number,
        token?: (string | null),
    ): CancelablePromise<ChatMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/messages/{message_id}/regenerate',
            path: {
                'message_id': messageId,
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
     * Edit message (creates branch)
     * Edit a user message, creating a new branch. Returns new message + AI response.
     * @param messageId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static editMessageApiV1ChatMessagesMessageIdEditPost(
        messageId: number,
        requestBody: EditMessageRequest,
        token?: (string | null),
    ): CancelablePromise<Array<ChatMessageResponse>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/messages/{message_id}/edit',
            path: {
                'message_id': messageId,
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
     * Get conversation tree
     * Get full conversation tree including all branches
     * @param sessionId
     * @param includeInactive Include inactive (archived) branches
     * @param token Auth token for image/file requests
     * @returns ConversationTreeResponse Successful Response
     * @throws ApiError
     */
    public static getConversationTreeApiV1ChatSessionsSessionIdTreeGet(
        sessionId: number,
        includeInactive: boolean = false,
        token?: (string | null),
    ): CancelablePromise<ConversationTreeResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions/{session_id}/tree',
            path: {
                'session_id': sessionId,
            },
            query: {
                'include_inactive': includeInactive,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Switch active branch
     * Switch to a different branch at a branch point
     * @param messageId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static switchBranchApiV1ChatMessagesMessageIdSwitchBranchPost(
        messageId: number,
        token?: (string | null),
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/messages/{message_id}/switch-branch',
            path: {
                'message_id': messageId,
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
     * Export conversation
     * Export conversation history as JSON or Markdown
     * @param sessionId
     * @param format Export format
     * @param includeFullTree Include all branches (not just active)
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportConversationApiV1ChatSessionsSessionIdExportGet(
        sessionId: number,
        format: string = 'json',
        includeFullTree: boolean = false,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/sessions/{session_id}/export',
            path: {
                'session_id': sessionId,
            },
            query: {
                'format': format,
                'include_full_tree': includeFullTree,
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns FileUploadResponse Successful Response
     * @throws ApiError
     */
    public static uploadChatFileApiV1ChatFilesUploadPost(
        formData: Body_upload_chat_file_api_v1_chat_files_upload_post,
        sessionId?: (number | null),
        token?: (string | null),
    ): CancelablePromise<FileUploadResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/files/upload',
            query: {
                'session_id': sessionId,
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
    /**
     * Dashboard Orchestrator Message
     * Send message to dashboard orchestrator with full system access
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static sendDashboardMessageApiV1ChatSessionsDashboardMessagePost(
        requestBody: ChatMessageCreate,
        token?: (string | null),
    ): CancelablePromise<ChatMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/sessions/dashboard/message',
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
}
