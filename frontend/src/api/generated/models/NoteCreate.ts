/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NoteFormat } from './NoteFormat';
/**
 * Note creation request.
 */
export type NoteCreate = {
    title: string;
    content: string;
    format?: NoteFormat;
    parent_id?: (number | null);
    tags?: (Array<string> | null);
};

