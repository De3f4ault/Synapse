/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HealthResponse } from '../models/HealthResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * Overall health check
     * Check health of all system services
     * @returns HealthResponse Successful Response
     * @throws ApiError
     */
    public static healthCheckApiV1HealthGet(): CancelablePromise<HealthResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/health',
        });
    }
    /**
     * Readiness check
     * Kubernetes readiness probe - check if app is ready for traffic
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readinessCheckApiV1HealthReadyGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/health/ready',
        });
    }
    /**
     * Liveness check
     * Kubernetes liveness probe - check if app process is alive
     * @returns any Successful Response
     * @throws ApiError
     */
    public static livenessCheckApiV1HealthLiveGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/health/live',
        });
    }
    /**
     * Root
     * Static metadata endpoint for system identification.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static rootGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
        });
    }
    /**
     * Ping
     * Liveness Probe.
     * Returns 200 OK immediately. Used by load balancers to detect frozen processes.
     * Does NOT touch the database.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static pingPingGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ping',
        });
    }
}
