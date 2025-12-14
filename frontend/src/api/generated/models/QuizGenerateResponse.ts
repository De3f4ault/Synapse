/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuizDifficulty } from './QuizDifficulty';
/**
 * AI quiz generation response.
 */
export type QuizGenerateResponse = {
    quiz_id: number;
    title: string;
    description: (string | null);
    difficulty: QuizDifficulty;
    question_count: number;
    status: string;
    message: string;
};

