/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskStatus } from './TaskStatus';
/**
 * Response from batch ingestion.
 */
export type BatchIngestResponse = {
    /**
     * Batch task ID
     */
    task_id: string;
    /**
     * Number of documents
     */
    document_count: number;
    status: TaskStatus;
    message: string;
};

