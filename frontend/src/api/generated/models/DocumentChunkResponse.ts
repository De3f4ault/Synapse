/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Document chunk response.
 */
export type DocumentChunkResponse = {
    id: number;
    document_id: number;
    content: string;
    chunk_index: number;
    page: (number | null);
    start_char: number;
    end_char: number;
    embedding_id: (string | null);
};

