/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FlashcardHybridResponse } from '../models/FlashcardHybridResponse';
import type { HybridSearchResponse } from '../models/HybridSearchResponse';
import type { NoteHybridResponse } from '../models/NoteHybridResponse';
import type { SearchResponse } from '../models/SearchResponse';
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
     * Search Hybrid Notes
     * Hybrid search notes using PostgreSQL-native BM25 + vector search.
     *
     * Uses pg_search (ParadeDB) for BM25 keyword matching and pgvector
     * for semantic similarity, combined with RRF (Reciprocal Rank Fusion).
     *
     * This provides better results than either BM25 or vector search alone:
     * - BM25 catches exact keyword matches
     * - Vector search catches semantically related content
     * - RRF combines both for optimal ranking
     * @param q Search query
     * @param limit Maximum results
     * @param bm25Weight BM25 weight
     * @param vectorWeight Vector weight
     * @param token Auth token for image/file requests
     * @returns NoteHybridResponse Successful Response
     * @throws ApiError
     */
    public static searchHybridNotesApiV1SearchHybridNotesGet(
        q: string,
        limit: number = 10,
        bm25Weight: number = 0.5,
        vectorWeight: number = 0.5,
        token?: (string | null),
    ): CancelablePromise<NoteHybridResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/search/hybrid/notes',
            query: {
                'q': q,
                'limit': limit,
                'bm25_weight': bm25Weight,
                'vector_weight': vectorWeight,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Search Hybrid Flashcards
     * Hybrid search flashcards using PostgreSQL-native BM25 + vector search.
     *
     * Searches both front_text and back_text of flashcards using:
     * - pg_search (ParadeDB) for BM25 keyword matching
     * - pgvector for semantic similarity
     * - RRF (Reciprocal Rank Fusion) for score combination
     * @param q Search query
     * @param limit Maximum results
     * @param bm25Weight BM25 weight
     * @param vectorWeight Vector weight
     * @param token Auth token for image/file requests
     * @returns FlashcardHybridResponse Successful Response
     * @throws ApiError
     */
    public static searchHybridFlashcardsApiV1SearchHybridFlashcardsGet(
        q: string,
        limit: number = 10,
        bm25Weight: number = 0.5,
        vectorWeight: number = 0.5,
        token?: (string | null),
    ): CancelablePromise<FlashcardHybridResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/search/hybrid/flashcards',
            query: {
                'q': q,
                'limit': limit,
                'bm25_weight': bm25Weight,
                'vector_weight': vectorWeight,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
