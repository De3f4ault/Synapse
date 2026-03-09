/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NoteFormat } from './NoteFormat';
/**
 * Note search result — flat format for endpoint consumption.
 */
export type NoteSearchResult = {
    id: number;
    title: string;
    content: (string | Record<string, any>);
    format: NoteFormat;
    /**
     * Search relevance score
     */
    score: number;
    /**
     * Match type: title, content, or semantic
     */
    match_type: string;
};

