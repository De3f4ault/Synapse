/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__uploads__MessageResponse } from '../models/app__api__rest__uploads__MessageResponse';
import type { app__models__link__EntityType } from '../models/app__models__link__EntityType';
import type { ConnectedEntityResponse } from '../models/ConnectedEntityResponse';
import type { EntityLinksResponse } from '../models/EntityLinksResponse';
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
     * @param token Auth token for image/file requests
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static listLinksApiV1LinksGet(
        linkType?: (LinkType | null),
        sourceType?: (app__models__link__EntityType | null),
        targetType?: (app__models__link__EntityType | null),
        page: number = 1,
        pageSize: number = 50,
        token?: (string | null),
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
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static createLinkApiV1LinksPost(
        requestBody: LinkCreate,
        token?: (string | null),
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/links',
            query: {
                'token': token,
            },
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
     * @param token Auth token for image/file requests
     * @returns KnowledgeGraphResponse Successful Response
     * @throws ApiError
     */
    public static getKnowledgeGraphApiV1LinksGraphGet(
        entityTypes?: (string | null),
        linkTypes?: (string | null),
        includeSuggested: boolean = false,
        token?: (string | null),
    ): CancelablePromise<KnowledgeGraphResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/graph',
            query: {
                'entity_types': entityTypes,
                'link_types': linkTypes,
                'include_suggested': includeSuggested,
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns EntityLinksResponse Successful Response
     * @throws ApiError
     */
    public static getEntityLinksApiV1LinksEntityEntityTypeEntityIdGet(
        entityType: app__models__link__EntityType,
        entityId: number,
        token?: (string | null),
    ): CancelablePromise<EntityLinksResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/entity/{entity_type}/{entity_id}',
            path: {
                'entity_type': entityType,
                'entity_id': entityId,
            },
            query: {
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns ConnectedEntityResponse Successful Response
     * @throws ApiError
     */
    public static getConnectedEntitiesApiV1LinksEntityEntityTypeEntityIdConnectedGet(
        entityType: app__models__link__EntityType,
        entityId: number,
        depth: number = 1,
        token?: (string | null),
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
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static getSuggestedLinksApiV1LinksSuggestedGet(
        entityType?: (app__models__link__EntityType | null),
        entityId?: (number | null),
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<LinkResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/suggested',
            query: {
                'entity_type': entityType,
                'entity_id': entityId,
                'limit': limit,
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static getLinkApiV1LinksLinkIdGet(
        linkId: number,
        token?: (string | null),
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/links/{link_id}',
            path: {
                'link_id': linkId,
            },
            query: {
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static updateLinkApiV1LinksLinkIdPut(
        linkId: number,
        requestBody: LinkUpdate,
        token?: (string | null),
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/links/{link_id}',
            path: {
                'link_id': linkId,
            },
            query: {
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns app__api__rest__uploads__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteLinkApiV1LinksLinkIdDelete(
        linkId: number,
        token?: (string | null),
    ): CancelablePromise<app__api__rest__uploads__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/links/{link_id}',
            path: {
                'link_id': linkId,
            },
            query: {
                'token': token,
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
     * @param token Auth token for image/file requests
     * @returns LinkResponse Successful Response
     * @throws ApiError
     */
    public static acceptLinkApiV1LinksLinkIdAcceptPost(
        linkId: number,
        token?: (string | null),
    ): CancelablePromise<LinkResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/links/{link_id}/accept',
            path: {
                'link_id': linkId,
            },
            query: {
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
