/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Deck response schema.
 */
export type DeckResponse = {
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
    tags?: (Array<string> | null);
    /**
     * Whether deck is public
     */
    is_public?: boolean;
    /**
     * Deck ID
     */
    id: number;
    /**
     * Owner user ID
     */
    user_id: number;
    /**
     * Number of cards in deck
     */
    card_count?: number;
    /**
     * Cards due for review
     */
    due_count?: number;
    /**
     * Whether AI generated
     */
    ai_generated?: boolean;
    /**
     * Creation time
     */
    created_at: string;
    /**
     * Last update time
     */
    updated_at: string;
};

