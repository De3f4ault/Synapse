/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SearchResult } from './SearchResult';
/**
 * Search response.
 */
export type SearchResponse = {
    query: string;
    search_type: string;
    total_results: number;
    results: Array<SearchResult>;
};

