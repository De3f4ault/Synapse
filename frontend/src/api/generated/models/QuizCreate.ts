/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuestionCreate } from './QuestionCreate';
/**
 * Quiz creation schema.
 */
export type QuizCreate = {
    title: string;
    description?: (string | null);
    difficulty?: string;
    time_limit_minutes?: (number | null);
    questions: Array<QuestionCreate>;
};

