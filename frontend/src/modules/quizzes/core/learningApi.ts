/**
 * Quiz Learning API — Phase Q3 Endpoints
 *
 * Client-side API calls for cross-module surfacing.
 * These are advisory endpoints that never mutate state.
 */

import { OpenAPI } from "@/api/generated/core/OpenAPI";
import { request as __request } from "@/api/generated/core/request";
import type { CancelablePromise } from "@/api/generated/core/CancelablePromise";

// ============================================================================
// Types
// ============================================================================

export interface RelatedFlashcard {
    id: number;
    front_text: string;
    similarity: number;
    evidence_strength: "weak_recent" | "weak_old" | "strong_recent" | "strong_old" | "no_data";
    last_quality: number | null;
    days_since_review: number | null;
}

export interface RelatedFlashcardsResponse {
    flashcards: RelatedFlashcard[];
    advisory_message: string;
}

export interface ContextNote {
    id: number;
    title: string;
    similarity: number;
}

export interface ContextForWeaknessResponse {
    notes: ContextNote[];
    advisory_message: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get flashcards semantically related to a quiz question.
 * Phase Q3.1: Advisory only, never mutates state.
 */
export function getRelatedFlashcards(
    questionId: number,
    limit: number = 5
): CancelablePromise<RelatedFlashcardsResponse> {
    return __request(OpenAPI, {
        method: "GET",
        url: `/api/v1/quizzes/questions/${questionId}/related-flashcards`,
        query: { limit },
    });
}

/**
 * Get notes related to recent difficulty areas.
 * Phase Q3.2: Advisory only, never mutates state.
 */
export function getContextForWeakness(
    lookbackDays: number = 7,
    limit: number = 3
): CancelablePromise<ContextForWeaknessResponse> {
    return __request(OpenAPI, {
        method: "GET",
        url: "/api/v1/quizzes/learning/context-for-weakness",
        query: {
            lookback_days: lookbackDays,
            limit,
        },
    });
}
