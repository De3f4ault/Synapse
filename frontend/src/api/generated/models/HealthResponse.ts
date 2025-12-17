/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ServiceStatus } from './ServiceStatus';
/**
 * Overall health status response.
 */
export type HealthResponse = {
    status: string;
    timestamp: string;
    services: Record<string, ServiceStatus>;
};

