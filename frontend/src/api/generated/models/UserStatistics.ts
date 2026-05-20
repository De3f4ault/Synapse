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
    total_cards?: number;
    /**
     * Cards due for review
     */
    due_cards?: number;
    /**
     * Total decks
     */
    total_decks?: number;
    /**
     * Total notes
     */
    total_notes?: number;
    /**
     * Total documents
     */
    total_documents?: number;
    /**
     * Current study streak in days
     */
    study_streak_days?: number;
    /**
     * Reviews completed today
     */
    reviews_today?: number;
    /**
     * Total reviews completed
     */
    total_reviews?: number;
    /**
     * Overall accuracy rate
     */
    overall_accuracy?: (number | null);
    /**
     * Total study time in minutes
     */
    total_study_time_minutes?: number;
    /**
     * Total study sessions
     */
    study_sessions_count?: number;
};

