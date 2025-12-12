/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Flashcard response - matches get_due_cards() SQL function output.
 *
 * Note: This differs from the Flashcard database model because
 * get_due_cards() returns calculated fields for prioritization.
 */
export type FlashcardResponse = {
    id: number;
    deck_id: number;
    front_text: string;
    back_text: string;
    front_media_url?: (string | null);
    back_media_url?: (string | null);
    ease_factor?: number;
    interval?: number;
    repetitions?: number;
    last_review?: (string | null);
    next_review?: (string | null);
    learning_state?: string;
    times_reviewed?: number;
    accuracy?: number;
    deck_name?: (string | null);
    overdue_days?: (number | null);
    priority_score?: (number | null);
};

