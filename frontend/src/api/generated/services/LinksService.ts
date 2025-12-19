/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__links__MessageResponse } from '../models/app__api__rest__links__MessageResponse';
import type { ConnectedEntityResponse } from '../models/ConnectedEntityResponse';
import type { EntityLinksResponse } from '../models/EntityLinksResponse';
import type { EntityType } from '../models/EntityType';
import type { KnowledgeGraphResponse } from '../models/KnowledgeGraphResponse';
import type { LinkCreate } from '../models/LinkCreate';
import type { LinkResponse } from '../models/LinkResponse';
import type { LinkType } from '../models/LinkType';
import type { LinkUpdate } from '../models/LinkUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LinksService {
    /**
     * List all links
     * Get all links for the current user
     * @param linkType Filter by link type
     * @param sourceType Filter by source entity type
     * @param targetType Filter by target entity type
     * @param page Page number
     * @param pageSize Items per page
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static listLinksApiV1LinksGet(
        linkType?: (LinkType | null),
        sourceType?: (EntityType | null),
        targetType?: (EntityType | null),
        page: number = 1,
        pageSize: number = 50,
    ): CancelablePromise<Array<LinkResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links',
            query: {
                'link_type': linkType,
                'source_type': sourceType,
                'target_type': targetType,
                'page': page,
                'page_size': pageSize,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create link
     * Create a new link between two entities
     * @param requestBody
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static createLinkApiV1LinksPost(
        requestBody: LinkCreate,
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/links',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get knowledge graph
     * Get full knowledge graph data for visualization
     * @param entityTypes Filter by entity types (comma-separated)
     * @param linkTypes Filter by link types (comma-separated)
     * @param includeSuggested Include suggested links
     * @returns KnowledgeGraphResponse Successful Response
     * @throws ApiError
     */
    public static getKnowledgeGraphApiV1LinksGraphGet(
        entityTypes?: (string | null),
        linkTypes?: (string | null),
        includeSuggested: boolean = false,
    ): CancelablePromise<KnowledgeGraphResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/graph',
            query: {
                'entity_types': entityTypes,
                'link_types': linkTypes,
                'include_suggested': includeSuggested,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get entity links
     * Get all links to and from a specific entity
     * @param entityType
     * @param entityId
     * @returns EntityLinksResponse Successful Response
     * @throws ApiError
     */
    public static getEntityLinksApiV1LinksEntityEntityTypeEntityIdGet(
        entityType: EntityType,
        entityId: number,
    ): CancelablePromise<EntityLinksResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/entity/{entity_type}/{entity_id}',
            path: {
                'entity_type': entityType,
                'entity_id': entityId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get connected entities
     * Get all entities connected to a specific entity (traverses graph)
     * @param entityType
     * @param entityId
     * @param depth How many hops to traverse
     * @returns ConnectedEntityResponse Successful Response
     * @throws ApiError
     */
    public static getConnectedEntitiesApiV1LinksEntityEntityTypeEntityIdConnectedGet(
        entityType: EntityType,
        entityId: number,
        depth: number = 1,
    ): CancelablePromise<Array<ConnectedEntityResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/entity/{entity_type}/{entity_id}/connected',
            path: {
                'entity_type': entityType,
                'entity_id': entityId,
            },
            query: {
                'depth': depth,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get suggested links
     * Get AI-suggested links pending user review
     * @param entityType Filter by entity type
     * @param entityId Filter by entity ID
     * @param limit Maximum results
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static getSuggestedLinksApiV1LinksSuggestedGet(
        entityType?: (EntityType | null),
        entityId?: (number | null),
        limit: number = 20,
    ): CancelablePromise<Array<LinkResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/suggested',
            query: {
                'entity_type': entityType,
                'entity_id': entityId,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get link
     * Get a specific link by ID
     * @param linkId
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static getLinkApiV1LinksLinkIdGet(
        linkId: number,
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/{link_id}',
            path: {
                'link_id': linkId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update link
     * Update link properties
     * @param linkId
     * @param requestBody
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static updateLinkApiV1LinksLinkIdPut(
        linkId: number,
        requestBody: LinkUpdate,
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/links/{link_id}',
            path: {
                'link_id': linkId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete link
     * Delete a link
     * @param linkId
     * @returns app__api__rest__links__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteLinkApiV1LinksLinkIdDelete(
        linkId: number,
    ): CancelablePromise<app__api__rest__links__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/links/{link_id}',
            path: {
                'link_id': linkId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Accept suggested link
     * Accept a suggested link, converting it to manual
     * @param linkId
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static acceptLinkApiV1LinksLinkIdAcceptPost(
        linkId: number,
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/links/{link_id}/accept',
            path: {
                'link_id': linkId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
