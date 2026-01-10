/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__links__MessageResponse } from '../models/app__api__rest__links__MessageResponse';
import type { PasswordChange } from '../models/PasswordChange';
import type { UserStatistics } from '../models/UserStatistics';
import type { UserUpdate } from '../models/UserUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Get user profile
     * Retrieve authenticated user's profile
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getProfileApiV1UsersMeGet(
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/me',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update user profile
     * Update authenticated user's profile information
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateProfileApiV1UsersMePut(
        requestBody: UserUpdate,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/users/me',
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
     * Delete account
     * Delete authenticated user's account (soft delete)
     * @param token Auth token for image/file requests
     * @returns app__api__rest__links__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteAccountApiV1UsersMeDelete(
        token?: (string | null),
    ): CancelablePromise<app__api__rest__links__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/users/me',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Change password
     * Change authenticated user's password
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns app__api__rest__links__MessageResponse Successful Response
     * @throws ApiError
     */
    public static changePasswordApiV1UsersMePasswordPut(
        requestBody: PasswordChange,
        token?: (string | null),
    ): CancelablePromise<app__api__rest__links__MessageResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/users/me/password',
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
     * Get user statistics
     * Retrieve comprehensive learning statistics
     * @param token Auth token for image/file requests
     * @returns UserStatistics Successful Response
     * @throws ApiError
     */
    public static getStatisticsApiV1UsersMeStatisticsGet(
        token?: (string | null),
    ): CancelablePromise<UserStatistics> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/me/statistics',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
