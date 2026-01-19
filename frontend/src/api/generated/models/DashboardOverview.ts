/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Dashboard overview statistics with flashcard + quiz metrics.
 */
export type DashboardOverview = {
    total_study_time_minutes: number;
    overall_accuracy: number;
    total_learning_events?: number;
    study_streak_days: number;
    total_cards: number;
    due_cards: number;
    cards_reviewed_today: number;
    total_decks: number;
    flashcard_accuracy?: number;
    flashcard_study_time_minutes?: number;
    total_flashcard_reviews?: number;
    total_quizzes?: number;
    total_quiz_attempts?: number;
    quiz_accuracy?: number;
    quiz_study_time_minutes?: number;
    total_notes: number;
    total_documents: number;
    analytics_version?: string;
    learning_event_count?: number;
    data_sources?: Record<string, string>;
};

