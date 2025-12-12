/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * AI model information.
 */
export type AIModelResponse = {
    id: string;
    name: string;
    description: string;
    capabilities: Array<string>;
    max_tokens: number;
    supports_vision: boolean;
    supports_search: boolean;
};

