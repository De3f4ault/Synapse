/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * JWT token response.
 */
export type TokenResponse = {
    /**
     * JWT access token
     */
    access_token: string;
    /**
     * JWT refresh token
     */
    refresh_token?: (string | null);
    /**
     * Token type
     */
    token_type?: string;
    /**
     * Token expiration time in seconds
     */
    expires_in: number;
};

