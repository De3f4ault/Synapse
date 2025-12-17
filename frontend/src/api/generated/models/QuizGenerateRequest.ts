/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuizDifficulty } from './QuizDifficulty';
/**
 * AI quiz generation request.
 */
export type QuizGenerateRequest = {
    /**
     * Topic to generate quiz about
     */
    topic: string;
    /**
     * Optional document to base quiz on
     */
    document_id?: (number | null);
    /**
     * Number of questions to generate
     */
    num_questions?: number;
    /**
     * Quiz difficulty level
     */
    difficulty?: QuizDifficulty;
};

