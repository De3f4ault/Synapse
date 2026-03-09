/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Document response schema.
 */
export type DocumentResponse = {
    /**
     * Document ID
     */
    id: number;
    /**
     * Owner user ID
     */
    user_id: number;
    /**
     * Original filename
     */
    filename: string;
    /**
     * File type (extension)
     */
    file_type: string;
    /**
     * File size in bytes
     */
    file_size: number;
    /**
     * Processing status
     */
    processing_status: string;
    /**
     * Number of pages
     */
    page_count?: (number | null);
    /**
     * Word count
     */
    word_count?: (number | null);
    /**
     * Whether OCR was used
     */
    ocr_performed?: boolean;
    /**
     * Gemini Files API URI
     */
    gemini_file_uri?: (string | null);
    /**
     * Whether Gemini file has expired
     */
    gemini_file_expired?: boolean;
    /**
     * Upload time
     */
    created_at: string;
    /**
     * Last update time
     */
    updated_at: string;
    /**
     * Document sector/category
     */
    sector?: (string | null);
    /**
     * User notes on document
     */
    notes?: (string | null);
    /**
     * AI-generated summary
     */
    ai_summary?: (string | null);
    /**
     * Reading progress 0.0-1.0
     */
    reading_progress?: (number | null);
};

