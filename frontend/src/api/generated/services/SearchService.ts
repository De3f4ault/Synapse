/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__schemas__search__SearchResponse } from '../models/app__schemas__search__SearchResponse';
import type { HybridSearchResponse } from '../models/HybridSearchResponse';
import type { SearchClickRequest } from '../models/SearchClickRequest';
import type { SearchClickResponse } from '../models/SearchClickResponse';
import type { SearchIntent } from '../models/SearchIntent';
import type { UnifiedSearchRequest } from '../models/UnifiedSearchRequest';
import type { UnifiedSearchResponse } from '../models/UnifiedSearchResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SearchService {
    /**
     * Search All
     * Advanced cross-module search (now using pg_search BM25).
     *
     * Search Types:
     * - fts: PostgreSQL pg_search BM25 (keyword matching)
     * - semantic: Vector similarity search (meaning matching)
     * - hybrid: Combined BM25 + semantic (recommended)
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
     * @returns app__schemas__search__SearchResponse Successful Response
     * @throws ApiError
     */
    public static searchAllApiV1SearchGet(
        query: string,
        modules?: (string | null),
        searchType: string = 'hybrid',
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<app__schemas__search__SearchResponse> {
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
     * Search Hybrid
     * Hybrid search using PostgreSQL-native pg_search BM25 + pgvector.
     *
     * This endpoint uses the new hybrid_search_notes SQL function with RRF.
     *
     * Search Modes:
     * - bm25: BM25 full-text search only (pg_search)
     * - semantic: Vector similarity search only (pgvector)
     * - hybrid: Combined BM25 + semantic with RRF fusion
     *
     * Weight Parameters:
     * - bm25_weight: How much to weight BM25 results (default 1.0)
     * - semantic_weight: How much to weight semantic results (default 1.0)
     *
     * Higher weight = more influence on final ranking.
     * @param query Search query
     * @param searchMode Search mode: bm25, semantic, or hybrid
     * @param bm25Weight BM25 weight in RRF
     * @param semanticWeight Semantic weight in RRF
     * @param limit Maximum results
     * @param token Auth token for image/file requests
     * @returns HybridSearchResponse Successful Response
     * @throws ApiError
     */
    public static searchHybridApiV1SearchHybridGet(
        query: string,
        searchMode: string = 'hybrid',
        bm25Weight: number = 1,
        semanticWeight: number = 1,
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<HybridSearchResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/search/hybrid',
            query: {
                'query': query,
                'search_mode': searchMode,
                'bm25_weight': bm25Weight,
                'semantic_weight': semanticWeight,
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
    /**
     * Search Autocomplete
     * Multi-entity autocomplete for the global search command palette.
     *
     * Returns matching documents, correspondents, tags, and document types
     * in a single response — matching Paperless-ngx global search behavior.
     * @param query Search query
     * @param limit Max results per entity type
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static searchAutocompleteApiV1SearchAutocompleteGet(
        query: string,
        limit: number = 10,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/search/autocomplete',
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
    /**
     * Unified Search
     * Execute search across all engines based on intent.
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns UnifiedSearchResponse Successful Response
     * @throws ApiError
     */
    public static unifiedSearchApiV1SearchUnifiedPost(
        requestBody: UnifiedSearchRequest,
        token?: (string | null),
    ): CancelablePromise<UnifiedSearchResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/search/unified',
            query: {
                'token': token,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unified Search (GET)
     * GET version of unified search for simple queries.
     * @param q Search query
     * @param intent Search intent
     * @param surface
     * @param limit Max results per engine
     * @param token Auth token for image/file requests
     * @returns UnifiedSearchResponse Successful Response
     * @throws ApiError
     */
    public static unifiedSearchGetApiV1SearchUnifiedGet(
        q: string,
        intent: SearchIntent = 'navigate',
        surface: 'cmdk' | 'chat' | 'dashboard' | 'study_hub' = 'cmdk',
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<UnifiedSearchResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/search/unified',
            query: {
                'q': q,
                'intent': intent,
                'surface': surface,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Record Search Click
     * Record a click on a search result.
     *
     * Called by the frontend when a user clicks on a search result.
     * Updates the search_queries analytics row with:
     * - Which entity was clicked
     * - What type of entity it was
     * - What rank position it was at
     *
     * This data enables future MRR (Mean Reciprocal Rank) calculation
     * and click-through rate analysis.
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns SearchClickResponse Successful Response
     * @throws ApiError
     */
    public static recordSearchClickApiV1SearchClickPost(
        requestBody: SearchClickRequest,
        token?: (string | null),
    ): CancelablePromise<SearchClickResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/search/click',
            query: {
                'token': token,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
