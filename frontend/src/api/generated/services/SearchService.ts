/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SearchResponse } from '../models/SearchResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SearchService {
    /**
     * Search All
     * Advanced cross-module search.
     *
     * Search Types:
     * - fts: PostgreSQL Full-Text Search (keyword matching)
     * - semantic: Vector similarity search (meaning matching)
     * - hybrid: Combined FTS + semantic (recommended)
     *
     * Modules:
     * - flashcards: Search flashcard content
     * - notes: Search note titles and content
     * - documents: Search document filenames
     * @param query Search query
     * @param modules Comma-separated modules to search
     * @param searchType Search strategy: fts, semantic, or hybrid
     * @param limit Maximum results
     * @param token Auth token for image/file requests
     * @returns SearchResponse Successful Response
     * @throws ApiError
     */
    public static searchAllApiV1SearchGet(
        query: string,
        modules?: (string | null),
        searchType: string = 'hybrid',
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<SearchResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/search',
            query: {
                'query': query,
                'modules': modules,
                'search_type': searchType,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Search Suggestions
     * Get search suggestions/autocomplete.
     *
     * Returns potential search terms based on user's content.
     * @param query Partial query
     * @param limit
     * @param token Auth token for image/file requests
     * @returns string Successful Response
     * @throws ApiError
     */
    public static searchSuggestionsApiV1SearchSuggestGet(
        query: string,
        limit: number = 10,
        token?: (string | null),
    ): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/search/suggest',
            query: {
                'query': query,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
