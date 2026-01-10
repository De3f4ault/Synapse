/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskStatus } from './TaskStatus';
/**
 * Response from document ingestion.
 */
export type DocumentIngestResponse = {
    document_id: string;
    status: TaskStatus;
    /**
     * Number of chunks created (if completed)
     */
    chunks?: (number | null);
    /**
     * Celery task ID (if processing)
     */
    task_id?: (string | null);
    /**
     * Status message
     */
    message?: (string | null);
};

