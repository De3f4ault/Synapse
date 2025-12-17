/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QuestionType } from './QuestionType';
/**
 * Question response with answers for learning mode.
 */
export type QuestionResponse = {
    id: number;
    question_text: string;
    question_type: QuestionType;
    options: (Record<string, any> | null);
    points: number;
    order: number;
    correct_answer: string;
    explanation?: (string | null);
};

