/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Flashcard generation from topic request (like quiz generation).
 */
export type FlashcardGenerateFromTopicRequest = {
    /**
     * Topic to generate flashcards about
     */
    topic: string;
    /**
     * Optional deck name (defaults to topic)
     */
    deck_name?: (string | null);
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

