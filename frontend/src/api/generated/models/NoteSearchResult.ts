/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NoteFormat } from './NoteFormat';
/**
 * Note search result.
 */
export type NoteSearchResult = {
    id: number;
    title: string;
    content: string;
    format: NoteFormat;
    score: number;
    match_type: string;
};

