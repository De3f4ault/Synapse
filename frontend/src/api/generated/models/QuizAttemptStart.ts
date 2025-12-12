/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuestionResponse } from './QuestionResponse';
/**
 * Quiz attempt start response.
 */
export type QuizAttemptStart = {
    attempt_id: number;
    quiz_id: number;
    started_at: string;
    questions: Array<QuestionResponse>;
};

