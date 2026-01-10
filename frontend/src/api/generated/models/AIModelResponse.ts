/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * AI model information.
 */
export type AIModelResponse = {
    /**
     * Model ID
     */
    id: string;
    /**
     * Display name
     */
    name: string;
    /**
     * Model description
     */
    description: string;
    /**
     * Model capabilities
     */
    capabilities: Array<string>;
    /**
     * Maximum context tokens
     */
    max_tokens: number;
    /**
     * Supports image input
     */
    supports_vision: boolean;
    /**
     * Supports web search
     */
    supports_search: boolean;
};

