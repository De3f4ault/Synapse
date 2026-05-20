/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Enum for note content formats.
 * `editor_version` is now the canonical source of truth.
 * This field is kept for backwards compatibility only.
 */
export enum NoteFormat {
    MARKDOWN = 'markdown',
    HTML = 'html',
    PLAIN = 'plain',
    BLOCKSUITE = 'blocksuite',  // Legacy — existing rows only
    TIPTAP = 'tiptap',          // Current default for all new notes
}
