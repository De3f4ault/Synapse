/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Flashcard generation from topic (like quiz generation).
 */
export type FlashcardGenerateFromTopicRequest = {
    /**
     * Topic
     */
    topic: string;
    /**
     * Optional deck name
     */
    deck_name?: (string | null);
    /**
     * Number of flashcards
     */
    num_cards?: number;
    /**
     * Difficulty: easy, medium, hard
     */
    difficulty?: string;
    tags?: (Array<string> | null);
};

