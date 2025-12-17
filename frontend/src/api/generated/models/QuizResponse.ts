/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuizDifficulty } from './QuizDifficulty';
/**
 * Quiz response.
 */
export type QuizResponse = {
    id: number;
    title: string;
    description: (string | null);
    difficulty: QuizDifficulty;
    time_limit_minutes: (number | null);
    question_count: number;
    user_id: number;
    created_at: string;
};

