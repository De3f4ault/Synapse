/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * AI quiz generation request.
 */
export type QuizGenerateRequest = {
    /**
     * Topic
     */
    topic: string;
    /**
     * Document to base quiz on
     */
    document_id?: (number | null);
    /**
     * Number of questions
     */
    num_questions?: number;
    /**
     * Difficulty: easy, medium, hard
     */
    difficulty?: string;
};

