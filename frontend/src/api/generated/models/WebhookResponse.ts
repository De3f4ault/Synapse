/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Webhook response schema.
 */
export type WebhookResponse = {
    /**
     * Webhook ID
     */
    id: number;
    /**
     * Owner user ID
     */
    user_id: number;
    /**
     * Webhook URL
     */
    url: string;
    /**
     * Subscribed event types
     */
    events: Array<string>;
    /**
     * Whether webhook is active
     */
    is_active: boolean;
    /**
     * Webhook description
     */
    description?: (string | null);
    /**
     * Creation time
     */
    created_at: string;
    /**
     * Last update time
     */
    updated_at: string;
    /**
     * Last trigger time
     */
    last_triggered_at?: (string | null);
    /**
     * Total deliveries attempted
     */
    total_deliveries: number;
    /**
     * Successful deliveries
     */
    successful_deliveries: number;
    /**
     * Failed deliveries
     */
    failed_deliveries: number;
};

