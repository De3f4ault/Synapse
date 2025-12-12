/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardOverview } from '../models/DashboardOverview';
import type { HeatmapData } from '../models/HeatmapData';
import type { PerformanceTrend } from '../models/PerformanceTrend';
import type { TopicMastery } from '../models/TopicMastery';
import type { WeakArea } from '../models/WeakArea';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Get Overview
     * Get dashboard overview with key metrics.
     * @returns DashboardOverview Successful Response
     * @throws ApiError
     */
    public static getOverviewApiV1AnalyticsOverviewGet(): CancelablePromise<DashboardOverview> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/overview',
        });
    }
    /**
     * Get Weak Areas
     * Identify weak areas based on review performance.
     * @param limit
     * @returns WeakArea Successful Response
     * @throws ApiError
     */
    public static getWeakAreasApiV1AnalyticsWeakAreasGet(
        limit: number = 10,
    ): CancelablePromise<Array<WeakArea>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/weak-areas',
            query: {
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Performance
     * Get performance trends over time.
     * @param days Number of days to analyze
     * @returns PerformanceTrend Successful Response
     * @throws ApiError
     */
    public static getPerformanceApiV1AnalyticsPerformanceGet(
        days: number = 30,
    ): CancelablePromise<Array<PerformanceTrend>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/performance',
            query: {
                'days': days,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Heatmap
     * Get activity heatmap data (for visualization).
     * @param days Number of days
     * @returns HeatmapData Successful Response
     * @throws ApiError
     */
    public static getHeatmapApiV1AnalyticsHeatmapGet(
        days: number = 365,
    ): CancelablePromise<Array<HeatmapData>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/heatmap',
            query: {
                'days': days,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Topic Mastery
     * Get mastery levels per topic/deck.
     * @returns TopicMastery Successful Response
     * @throws ApiError
     */
    public static getTopicMasteryApiV1AnalyticsTopicsGet(): CancelablePromise<Array<TopicMastery>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/topics',
        });
    }
    /**
     * Export Analytics
     * Export analytics data.
     * @param format
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportAnalyticsApiV1AnalyticsExportPost(
        format: string = 'csv',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/analytics/export',
            query: {
                'format': format,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
