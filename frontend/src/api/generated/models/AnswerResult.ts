/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Individual answer result.
 */
export type AnswerResult = {
    question_id: number;
    question_text: string;
    your_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: (string | null);
    points_earned: number;
};

