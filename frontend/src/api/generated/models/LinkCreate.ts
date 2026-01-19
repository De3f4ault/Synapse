/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__models__link__EntityType } from './app__models__link__EntityType';
import type { LinkType } from './LinkType';
/**
 * Link creation request.
 */
export type LinkCreate = {
    source_type: app__models__link__EntityType;
    source_id: number;
    target_type: app__models__link__EntityType;
    target_id: number;
    link_type?: LinkType;
    strength?: number;
    label?: (string | null);
    link_metadata?: (Record<string, any> | null);
};

