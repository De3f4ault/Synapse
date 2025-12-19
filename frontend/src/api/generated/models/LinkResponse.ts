/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityType } from './EntityType';
import type { LinkType } from './LinkType';
/**
 * Link response.
 */
export type LinkResponse = {
    id: number;
    source_type: EntityType;
    source_id: number;
    target_type: EntityType;
    target_id: number;
    link_type: LinkType;
    strength: number;
    label: (string | null);
    link_metadata: (Record<string, any> | null);
    created_at: string;
    updated_at: string;
};

