/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Processing status check response.
 */
export type ProcessingStatusResponse = {
    /**
     * Document ID
     */
    document_id: number;
    /**
     * Processing status
     */
    status: string;
    /**
     * Processing progress 0-100
     */
    progress_percentage: number;
    /**
     * Status message
     */
    message: string;
};

