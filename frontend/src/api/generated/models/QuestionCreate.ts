/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuestionType } from './QuestionType';
/**
 * Question creation schema.
 */
export type QuestionCreate = {
    question_text: string;
    question_type: QuestionType;
    options?: (Record<string, any> | null);
    correct_answer: string;
    explanation?: (string | null);
    points?: number;
};

