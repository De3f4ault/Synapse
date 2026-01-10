/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LLMEnhancementStrategy } from './LLMEnhancementStrategy';
import type { SourceType } from './SourceType';
/**
 * Request to query RAG system.
 */
export type QueryRequest = {
    /**
     * User query
     */
    query: string;
    /**
     * Number of results to return
     */
    top_k?: number;
    /**
     * Content source to search
     */
    source_type?: SourceType;
    /**
     * Enable LLM query enhancement (GPT-4/Claude)
     */
    enable_llm_enhancement?: boolean;
    /**
     * LLM enhancement strategy
     */
    llm_strategy?: LLMEnhancementStrategy;
};

