/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Document chunk response schema.
 */
export type DocumentChunkResponse = {
    /**
     * Chunk ID
     */
    id: number;
    /**
     * Parent document ID
     */
    document_id: number;
    /**
     * Chunk text content
     */
    content: string;
    /**
     * Chunk index within document
     */
    chunk_index: number;
    /**
     * Page number
     */
    page?: (number | null);
    /**
     * Start character position
     */
    start_char: number;
    /**
     * End character position
     */
    end_char: number;
    /**
     * Embedding vector ID
     */
    embedding_id?: (string | null);
};

