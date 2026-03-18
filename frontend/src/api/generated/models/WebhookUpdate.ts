/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Webhook update schema.
 */
export type WebhookUpdate = {
    /**
     * Webhook URL
     */
    url?: (string | null);
    /**
     * Event types
     */
    events?: (Array<string> | null);
    /**
     * Webhook secret
     */
    secret?: (string | null);
    /**
     * Whether webhook is active
     */
    is_active?: (boolean | null);
    /**
     * Webhook description
     */
    description?: (string | null);
};

