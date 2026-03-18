/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardOverview } from '../models/DashboardOverview';
import type { HeatmapData } from '../models/HeatmapData';
import type { LastSessionStats } from '../models/LastSessionStats';
import type { PerformanceTrend } from '../models/PerformanceTrend';
import type { ReviewForecast } from '../models/ReviewForecast';
import type { TimeBucket } from '../models/TimeBucket';
import type { TodayStats } from '../models/TodayStats';
import type { TopicMastery } from '../models/TopicMastery';
import type { WeakArea } from '../models/WeakArea';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Get Overview
     * Get dashboard overview from pre-computed materialized view.
     *
     * Falls back to direct queries if view not available.
     * Performance: 1 SQL function call vs 8 Python queries.
     * @param token Auth token for image/file requests
     * @returns DashboardOverview Successful Response
     * @throws ApiError
     */
    public static getOverviewApiV1AnalyticsOverviewGet(
        token?: (string | null),
    ): CancelablePromise<DashboardOverview> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/overview',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Weak Areas
     * Identify weak areas based on review performance.
     * @param limit
     * @param token Auth token for image/file requests
     * @returns WeakArea Successful Response
     * @throws ApiError
     */
    public static getWeakAreasApiV1AnalyticsWeakAreasGet(
        limit: number = 10,
        token?: (string | null),
    ): CancelablePromise<Array<WeakArea>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/weak-areas',
            query: {
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Performance
     * Get performance trends over time with configurable time buckets.
     * @param days Number of days to analyze
     * @param bucket Time bucket: day, week, or month
     * @param token Auth token for image/file requests
     * @returns PerformanceTrend Successful Response
     * @throws ApiError
     */
    public static getPerformanceApiV1AnalyticsPerformanceGet(
        days: number = 30,
        bucket: TimeBucket = 'day',
        token?: (string | null),
    ): CancelablePromise<Array<PerformanceTrend>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/performance',
            query: {
                'days': days,
                'bucket': bucket,
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns HeatmapData Successful Response
     * @throws ApiError
     */
    public static getHeatmapApiV1AnalyticsHeatmapGet(
        days: number = 365,
        token?: (string | null),
    ): CancelablePromise<Array<HeatmapData>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/heatmap',
            query: {
                'days': days,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Topic Mastery
     * Get mastery levels per topic/deck.
     * @param token Auth token for image/file requests
     * @returns TopicMastery Successful Response
     * @throws ApiError
     */
    public static getTopicMasteryApiV1AnalyticsTopicsGet(
        token?: (string | null),
    ): CancelablePromise<Array<TopicMastery>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/topics',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Today Stats
     * Get today's study statistics from the Learning Ledger.
     * @param token Auth token for image/file requests
     * @returns TodayStats Successful Response
     * @throws ApiError
     */
    public static getTodayStatsApiV1AnalyticsTodayGet(
        token?: (string | null),
    ): CancelablePromise<TodayStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/today',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Forecast
     * Get review forecast — cards due today, tomorrow, this week, and overdue.
     * @param token Auth token for image/file requests
     * @returns ReviewForecast Successful Response
     * @throws ApiError
     */
    public static getForecastApiV1AnalyticsForecastGet(
        token?: (string | null),
    ): CancelablePromise<ReviewForecast> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/forecast',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Last Session
     * Get last study session quality feedback (45-min session window).
     * @param token Auth token for image/file requests
     * @returns LastSessionStats Successful Response
     * @throws ApiError
     */
    public static getLastSessionApiV1AnalyticsLastSessionGet(
        token?: (string | null),
    ): CancelablePromise<LastSessionStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/last-session',
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Export Analytics
     * Export analytics data.
     * @param format
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportAnalyticsApiV1AnalyticsExportPost(
        format: string = 'csv',
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/analytics/export',
            query: {
                'format': format,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
