/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Deck creation schema.
 */
export type DeckCreate = {
    /**
     * Deck name
     */
    name: string;
    /**
     * Deck description
     */
    description?: (string | null);
    /**
     * Deck tags
     */
    tags?: Array<string>;
    /**
     * Whether deck is public
     */
    is_public?: boolean;
};

