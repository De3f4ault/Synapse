/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NoteFormat } from './NoteFormat';
/**
 * Note update request.
 */
export type NoteUpdate = {
    title?: (string | null);
    content?: (string | Record<string, any> | null);
    format?: (NoteFormat | null);
};

