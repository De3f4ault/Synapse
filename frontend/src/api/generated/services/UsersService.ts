/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__documents__MessageResponse } from '../models/app__api__rest__documents__MessageResponse';
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
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getProfileApiV1UsersMeGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/me',
        });
    }
    /**
     * Update user profile
     * Update authenticated user's profile information
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateProfileApiV1UsersMePut(
        requestBody: UserUpdate,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/users/me',
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
     * @returns app__api__rest__documents__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteAccountApiV1UsersMeDelete(): CancelablePromise<app__api__rest__documents__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/users/me',
        });
    }
    /**
     * Change password
     * Change authenticated user's password
     * @param requestBody
     * @returns app__api__rest__documents__MessageResponse Successful Response
     * @throws ApiError
     */
    public static changePasswordApiV1UsersMePasswordPut(
        requestBody: PasswordChange,
    ): CancelablePromise<app__api__rest__documents__MessageResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/users/me/password',
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
     * @returns UserStatistics Successful Response
     * @throws ApiError
     */
    public static getStatisticsApiV1UsersMeStatisticsGet(): CancelablePromise<UserStatistics> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/me/statistics',
        });
    }
}
