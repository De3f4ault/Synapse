/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProcessingStatus } from './ProcessingStatus';
/**
 * Processing status check response.
 */
export type ProcessingStatusResponse = {
    document_id: number;
    status: ProcessingStatus;
    progress_percentage: number;
    message: string;
};

