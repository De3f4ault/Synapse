/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Single result chunk from RAG query.
 */
export type QueryChunk = {
    /**
     * Chunk text content
     */
    text: string;
    /**
     * Relevance score
     */
    score: number;
    /**
     * Chunk metadata
     */
    metadata: Record<string, any>;
};

