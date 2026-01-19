/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Deck response.
 */
export type DeckResponse = {
    id: number;
    name: string;
    description: (string | null);
    tags: (Array<string> | null);
    is_public: boolean;
    ai_generated: boolean;
    card_count: number;
    due_count: number;
    user_id: number;
    created_at: string;
    updated_at: string;
};

