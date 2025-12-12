/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuestionCreate } from './QuestionCreate';
import type { QuizDifficulty } from './QuizDifficulty';
/**
 * Quiz creation schema.
 */
export type QuizCreate = {
    title: string;
    description?: (string | null);
    difficulty?: QuizDifficulty;
    time_limit_minutes?: (number | null);
    questions: Array<QuestionCreate>;
};

