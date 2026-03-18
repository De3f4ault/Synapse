/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * User response schema.
 */
export type UserResponse = {
    /**
     * User email address
     */
    email: string;
    /**
     * User full name
     */
    full_name: string;
    /**
     * User ID
     */
    id: number;
    /**
     * Whether user is active
     */
    is_active: boolean;
    /**
     * Whether user is admin
     */
    is_admin?: boolean;
    /**
     * Whether email is verified
     */
    email_verified?: boolean;
    /**
     * User timezone
     */
    timezone?: (string | null);
    /**
     * Last login time
     */
    last_login?: (string | null);
    /**
     * Account creation time
     */
    created_at: string;
};

