/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Recursive note tree node.
 */
export type NoteTreeNode = {
    id: number;
    title: string;
    parent_id: (number | null);
    children?: Array<NoteTreeNode>;
};

