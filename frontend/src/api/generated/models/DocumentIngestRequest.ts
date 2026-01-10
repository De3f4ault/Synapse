/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SourceType } from './SourceType';
/**
 * Request to ingest document into RAG.
 */
export type DocumentIngestRequest = {
    /**
     * Unique document identifier
     */
    document_id: string;
    /**
     * Document title
     */
    title: string;
    /**
     * Document text content
     */
    text: string;
    /**
     * Content source type
     */
    source_type?: SourceType;
};

