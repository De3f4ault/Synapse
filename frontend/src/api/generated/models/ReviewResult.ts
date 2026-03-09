/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Review result schema (returned after recording review).
 */
export type ReviewResult = {
    /**
     * Next review date
     */
    next_review_date: string;
    /**
     * New interval in days
     */
    new_interval: number;
    /**
     * New ease factor
     */
    new_ease_factor: string;
    /**
     * Whether operation succeeded
     */
    success: boolean;
    /**
     * Result message
     */
    message: string;
};

