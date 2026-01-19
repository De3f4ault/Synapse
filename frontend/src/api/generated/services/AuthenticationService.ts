/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__uploads__MessageResponse } from '../models/app__api__rest__uploads__MessageResponse';
import type { TokenResponse } from '../models/TokenResponse';
import type { UserLogin } from '../models/UserLogin';
import type { UserRegister } from '../models/UserRegister';
import type { UserResponse } from '../models/UserResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Register new user
     * Create a new user account and return access token
     * @param requestBody
     * @returns TokenResponse Successful Response
     * @throws ApiError
     */
    public static registerApiV1AuthRegisterPost(
        requestBody: UserRegister,
    ): CancelablePromise<TokenResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * User login
     * Authenticate user and return access token
     * @param requestBody
     * @returns TokenResponse Successful Response
     * @throws ApiError
     */
    public static loginApiV1AuthLoginPost(
        requestBody: UserLogin,
    ): CancelablePromise<TokenResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * User logout
     * Invalidate current session by blacklisting JWT token
     * @param token Auth token for image/file requests
     * @returns app__api__rest__uploads__MessageResponse Successful Response
     * @throws ApiError
     */
    public static logoutApiV1AuthLogoutPost(
        token?: (string | null),
    ): CancelablePromise<app__api__rest__uploads__MessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/logout',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get current user
     * Retrieve authenticated user's profile information
     * @param token Auth token for image/file requests
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static getCurrentUserProfileApiV1AuthMeGet(
        token?: (string | null),
    ): CancelablePromise<UserResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auth/me',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Refresh access token
     * Generate new access token using existing valid token
     * @param token Auth token for image/file requests
     * @returns TokenResponse Successful Response
     * @throws ApiError
     */
    public static refreshTokenApiV1AuthRefreshPost(
        token?: (string | null),
    ): CancelablePromise<TokenResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
