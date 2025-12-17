/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnswerResult } from './AnswerResult';
/**
 * Quiz result response.
 */
export type QuizResultResponse = {
    attempt_id: number;
    score: string;
    max_score: number;
    percentage: number;
    time_taken_seconds: number;
    answers: Array<AnswerResult>;
};

