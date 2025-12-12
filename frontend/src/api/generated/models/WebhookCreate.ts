/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Webhook creation request.
 */
export type WebhookCreate = {
    /**
     * Webhook endpoint URL
     */
    url: string;
    /**
     * Events to subscribe to
     */
    events: Array<string>;
    /**
     * Webhook description
     */
    description?: (string | null);
    /**
     * Whether webhook is active
     */
    active?: boolean;
};

