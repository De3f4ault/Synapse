/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StudySessionType } from './StudySessionType';
/**
 * Study session response.
 */
export type StudySessionResponse = {
    id: number;
    session_type: StudySessionType;
    modules_used: Array<string>;
    items_completed: number;
    items_correct: number;
    accuracy: number;
    time_spent_seconds: number;
    started_at: string;
    ended_at: (string | null);
    is_completed: boolean;
};

