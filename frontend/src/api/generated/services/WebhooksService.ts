/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WebhookCreate } from '../models/WebhookCreate';
import type { WebhookResponse } from '../models/WebhookResponse';
import type { WebhookTestRequest } from '../models/WebhookTestRequest';
import type { WebhookTestResponse } from '../models/WebhookTestResponse';
import type { WebhookUpdate } from '../models/WebhookUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WebhooksService {
    /**
     * List webhooks
     * Retrieve user's webhooks
     * @param activeOnly Only active webhooks
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns WebhookResponse Successful Response
     * @throws ApiError
     */
    public static listWebhooksApiV1WebhooksGet(
        activeOnly: boolean = false,
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<WebhookResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/webhooks',
            query: {
                'active_only': activeOnly,
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
     * Create webhook
     * Create a new webhook for event notifications
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns WebhookResponse Successful Response
     * @throws ApiError
     */
    public static createWebhookApiV1WebhooksPost(
        requestBody: WebhookCreate,
        token?: (string | null),
    ): CancelablePromise<WebhookResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/webhooks',
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
     * Get webhook
     * Retrieve a specific webhook
     * @param webhookId
     * @param token Auth token for image/file requests
     * @returns WebhookResponse Successful Response
     * @throws ApiError
     */
    public static getWebhookApiV1WebhooksWebhookIdGet(
        webhookId: number,
        token?: (string | null),
    ): CancelablePromise<WebhookResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/webhooks/{webhook_id}',
            path: {
                'webhook_id': webhookId,
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
     * Update webhook
     * Update a webhook configuration
     * @param webhookId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns WebhookResponse Successful Response
     * @throws ApiError
     */
    public static updateWebhookApiV1WebhooksWebhookIdPut(
        webhookId: number,
        requestBody: WebhookUpdate,
        token?: (string | null),
    ): CancelablePromise<WebhookResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/webhooks/{webhook_id}',
            path: {
                'webhook_id': webhookId,
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
     * Delete webhook
     * Delete a webhook (soft delete)
     * @param webhookId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteWebhookApiV1WebhooksWebhookIdDelete(
        webhookId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/webhooks/{webhook_id}',
            path: {
                'webhook_id': webhookId,
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
     * Test webhook
     * Send test payload to webhook
     * @param webhookId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns WebhookTestResponse Successful Response
     * @throws ApiError
     */
    public static testWebhookApiV1WebhooksWebhookIdTestPost(
        webhookId: number,
        requestBody: WebhookTestRequest,
        token?: (string | null),
    ): CancelablePromise<WebhookTestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/webhooks/{webhook_id}/test',
            path: {
                'webhook_id': webhookId,
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
     * List available events
     * Get list of all available webhook event types
     * @returns any Successful Response
     * @throws ApiError
     */
    public static listEventTypesApiV1WebhooksEventsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/webhooks/events',
        });
    }
}
