/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Unified search result.
 */
export type SearchResult = {
    type: string;
    id: number;
    title: string;
    content?: (string | null);
    headline?: (string | null);
    relevance_score?: (number | null);
    similarity_score?: (number | null);
    hybrid_score?: (number | null);
    metadata?: (Record<string, any> | null);
};

