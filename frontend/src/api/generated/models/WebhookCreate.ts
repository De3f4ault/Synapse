/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Webhook creation schema.
 */
export type WebhookCreate = {
    /**
     * Webhook URL
     */
    url: string;
    /**
     * Event types to subscribe to
     */
    events: Array<string>;
    /**
     * Webhook secret for HMAC signature
     */
    secret: string;
    /**
     * Whether webhook is active
     */
    is_active?: boolean;
    /**
     * Webhook description
     */
    description?: (string | null);
};

