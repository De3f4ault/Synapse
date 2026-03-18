/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Webhook test response schema.
 */
export type WebhookTestResponse = {
    /**
     * Whether test was successful
     */
    success: boolean;
    /**
     * HTTP response code
     */
    status_code?: (number | null);
    /**
     * Response time in milliseconds
     */
    response_time_ms?: (number | null);
    /**
     * Error message if failed
     */
    error?: (string | null);
    /**
     * Test payload sent
     */
    payload_sent: Record<string, any>;
};

