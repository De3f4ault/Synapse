/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * User feedback on RAG query results.
 */
export type FeedbackRequest = {
    /**
     * Original query
     */
    query: string;
    /**
     * Query results
     */
    results: Array<Record<string, any>>;
    /**
     * Indices of clicked results
     */
    clicked_indices: Array<number>;
    /**
     * Time spent reviewing results (milliseconds)
     */
    time_spent_ms: number;
    /**
     * User rating (1-5 stars)
     */
    helpful_rating?: (number | null);
};

