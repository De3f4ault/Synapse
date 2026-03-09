/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AIModelResponse } from '../models/AIModelResponse';
import type { ChatMessageCreate } from '../models/ChatMessageCreate';
import type { ChatMessageResponse } from '../models/ChatMessageResponse';
import type { ChatSessionCreate } from '../models/ChatSessionCreate';
import type { ChatSessionResponse } from '../models/ChatSessionResponse';
import type { ChatSessionUpdate } from '../models/ChatSessionUpdate';
import type { ConversationSearchResult } from '../models/ConversationSearchResult';
import type { ConversationTreeResponse } from '../models/ConversationTreeResponse';
import type { DashboardMessageCreate } from '../models/DashboardMessageCreate';
import type { EditMessageRequest } from '../models/EditMessageRequest';
import type { NotesMessageCreate } from '../models/NotesMessageCreate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatService {
    /**
     * List chat sessions
     * Retrieve user's chat sessions with pagination
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
     * Retrieve a specific chat session by ID
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
     * Update chat session
     * Update session details (e.g., title)
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
     * Delete chat session
     * Soft-delete a chat session
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
     * Search conversations
     * Search across session titles and message content using full-text search
     * @param query Search query
     * @param limit Maximum results to return
     * @param includeMessages Include message content matches
     * @param token Auth token for image/file requests
     * @returns ConversationSearchResult Successful Response
     * @throws ApiError
     */
    public static searchConversationsApiV1ChatSearchGet(
        query: string,
        limit: number = 20,
        includeMessages: boolean = true,
        token?: (string | null),
    ): CancelablePromise<Array<ConversationSearchResult>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/search',
            query: {
                'query': query,
                'limit': limit,
                'include_messages': includeMessages,
                'token': token,
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
     * Send a message and get an AI response (non-streaming)
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
     * Regenerate the last AI response
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
     * Edit a user message. This creates a new conversation branch.
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
     * Retrieve the full conversation tree including all branches
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
     * Switch the active conversation path to a different branch
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
        requestBody: DashboardMessageCreate,
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
    /**
     * Notes AI Message
     * Send message to Notes AI for text editing assistance
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ChatMessageResponse Successful Response
     * @throws ApiError
     */
    public static sendNotesMessageApiV1ChatSessionsNotesMessagePost(
        requestBody: NotesMessageCreate,
        token?: (string | null),
    ): CancelablePromise<ChatMessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/sessions/notes/message',
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
     * Notes AI Streaming
     * Stream AI response for notes text editing with Server-Sent Events
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static streamNotesMessageApiV1ChatSessionsNotesStreamPost(
        requestBody: NotesMessageCreate,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/sessions/notes/stream',
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
