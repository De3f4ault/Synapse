/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Webhook response.
 */
export type WebhookResponse = {
    id: number;
    url: string;
    events: Array<string>;
    description: (string | null);
    active: boolean;
    secret: string;
    created_at: string;
    updated_at: string;
    last_triggered_at: (string | null);
    success_count: number;
    failure_count: number;
};

