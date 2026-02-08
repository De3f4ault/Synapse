/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LinkEntityType } from './LinkEntityType';
import type { LinkType } from './LinkType';
/**
 * Link creation request.
 */
export type LinkCreate = {
    source_type: LinkEntityType;
    source_id: number;
    target_type: LinkEntityType;
    target_id: number;
    link_type?: LinkType;
    strength?: number;
    label?: (string | null);
    link_metadata?: (Record<string, any> | null);
};

