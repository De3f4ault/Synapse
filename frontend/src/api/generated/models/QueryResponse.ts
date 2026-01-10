/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QueryChunk } from './QueryChunk';
/**
 * Response from RAG query.
 */
export type QueryResponse = {
    /**
     * Enhanced query used
     */
    query: string;
    /**
     * Original user query
     */
    original_query: string;
    /**
     * Retrieved chunks
     */
    chunks: Array<QueryChunk>;
    /**
     * Number of chunks returned
     */
    count: number;
    /**
     * Cross-encoder reranking applied
     */
    reranked: boolean;
    /**
     * Learning-aware boosting applied
     */
    learning_aware: boolean;
    /**
     * Query expansion applied
     */
    query_enhanced: boolean;
    /**
     * LLM enhancement applied
     */
    llm_enhanced: boolean;
    /**
     * Total processing time (ms)
     */
    processing_time_ms?: (number | null);
};

