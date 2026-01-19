/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NoteFormat } from './NoteFormat';
/**
 * Note response.
 */
export type NoteResponse = {
    id: number;
    title: string;
    content: (string | Record<string, any>);
    format: NoteFormat;
    parent_id: (number | null);
    user_id: number;
    embedding_id: (string | null);
    created_at: string;
    updated_at: string;
    children_count?: number;
};

