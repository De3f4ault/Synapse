/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * File upload response for chat.
 */
export type FileUploadResponse = {
    /**
     * File ID
     */
    id: string;
    /**
     * Original filename
     */
    filename: string;
    /**
     * MIME type
     */
    file_type: string;
    /**
     * File size in bytes
     */
    file_size: number;
    /**
     * File access URL
     */
    url: string;
    /**
     * Preview/thumbnail URL
     */
    preview_url?: (string | null);
    /**
     * Upload timestamp
     */
    uploaded_at: string;
};

