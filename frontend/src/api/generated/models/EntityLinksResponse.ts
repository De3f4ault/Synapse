/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LinkResponse } from './LinkResponse';
/**
 * Response for all links associated with an entity.
 */
export type EntityLinksResponse = {
    outgoing: Array<LinkResponse>;
    backlinks: Array<LinkResponse>;
};

