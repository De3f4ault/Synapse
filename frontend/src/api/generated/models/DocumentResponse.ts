/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProcessingStatus } from './ProcessingStatus';
/**
 * Document response.
 */
export type DocumentResponse = {
    id: number;
    filename: string;
    file_type: string;
    file_size: number;
    processing_status: ProcessingStatus;
    page_count: (number | null);
    word_count: (number | null);
    gemini_file_uri: (string | null);
    gemini_file_expired: boolean;
    user_id: number;
    created_at: string;
    updated_at: string;
};

