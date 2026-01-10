/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskStatus } from './TaskStatus';
/**
 * Status of background task.
 */
export type TaskStatusResponse = {
    task_id: string;
    status: TaskStatus;
    result?: (Record<string, any> | null);
    error?: (string | null);
    /**
     * Progress percentage (0-100)
     */
    progress?: (number | null);
};

