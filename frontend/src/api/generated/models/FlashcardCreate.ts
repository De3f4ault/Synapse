/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Flashcard creation schema.
 */
export type FlashcardCreate = {
    /**
     * Front of card
     */
    front_text: string;
    /**
     * Back of card
     */
    back_text: string;
    /**
     * Front media URL
     */
    front_media_url?: (string | null);
    /**
     * Back media URL
     */
    back_media_url?: (string | null);
    /**
     * Deck ID
     */
    deck_id: number;
};

