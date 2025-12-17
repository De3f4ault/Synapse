/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Flashcard creation request.
 */
export type FlashcardCreate = {
    deck_id: number;
    front_text: string;
    back_text: string;
    front_media_url?: (string | null);
    back_media_url?: (string | null);
};

