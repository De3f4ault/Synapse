/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Flashcard generation from document request.
 */
export type FlashcardGenerateRequest = {
    /**
     * Document to generate from
     */
    document_id: number;
    /**
     * Name for the new deck
     */
    deck_name: string;
    /**
     * Number of flashcards to generate
     */
    num_cards?: number;
    /**
     * Difficulty level: easy, medium, hard
     */
    difficulty?: string;
    tags?: (Array<string> | null);
};

