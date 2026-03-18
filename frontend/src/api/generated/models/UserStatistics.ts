/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * User statistics schema.
 */
export type UserStatistics = {
    /**
     * Total flashcards
     */
    total_cards: number;
    /**
     * Cards due for review
     */
    due_cards: number;
    /**
     * Total decks
     */
    total_decks: number;
    /**
     * Total notes
     */
    total_notes: number;
    /**
     * Total documents
     */
    total_documents: number;
    /**
     * Current study streak in days
     */
    study_streak: number;
    /**
     * Total study time in seconds
     */
    total_study_time: number;
    /**
     * Overall accuracy rate
     */
    overall_accuracy?: (number | null);
};

