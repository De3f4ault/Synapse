/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__uploads__MessageResponse } from '../models/app__api__rest__uploads__MessageResponse';
import type { DeckCreate } from '../models/DeckCreate';
import type { DeckResponse } from '../models/DeckResponse';
import type { DeckUpdate } from '../models/DeckUpdate';
import type { FlashcardCreate } from '../models/FlashcardCreate';
import type { FlashcardGenerateFromTopicRequest } from '../models/FlashcardGenerateFromTopicRequest';
import type { FlashcardGenerateRequest } from '../models/FlashcardGenerateRequest';
import type { FlashcardGenerateResponse } from '../models/FlashcardGenerateResponse';
import type { FlashcardResponse } from '../models/FlashcardResponse';
import type { FlashcardUpdate } from '../models/FlashcardUpdate';
import type { ImportRequest } from '../models/ImportRequest';
import type { ImportResult } from '../models/ImportResult';
import type { ReviewResult } from '../models/ReviewResult';
import type { ReviewSubmit } from '../models/ReviewSubmit';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FlashcardsService {
    /**
     * List decks
     * Retrieve user's decks with optional filtering
     * @param tags Filter by tags (comma-separated)
     * @param isPublic Filter by public status
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static listDecksApiV1DecksGet(
        tags?: (string | null),
        isPublic?: (boolean | null),
        page: number = 1,
        pageSize: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<DeckResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/decks',
            query: {
                'tags': tags,
                'is_public': isPublic,
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
     * Create deck
     * Create a new flashcard deck
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static createDeckApiV1DecksPost(
        requestBody: DeckCreate,
        token?: (string | null),
    ): CancelablePromise<DeckResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks',
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
     * Get deck
     * Retrieve a specific deck by ID
     * @param deckId
     * @param token Auth token for image/file requests
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static getDeckApiV1DecksDeckIdGet(
        deckId: number,
        token?: (string | null),
    ): CancelablePromise<DeckResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/decks/{deck_id}',
            path: {
                'deck_id': deckId,
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
     * Update deck
     * Update an existing deck
     * @param deckId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static updateDeckApiV1DecksDeckIdPut(
        deckId: number,
        requestBody: DeckUpdate,
        token?: (string | null),
    ): CancelablePromise<DeckResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/decks/{deck_id}',
            path: {
                'deck_id': deckId,
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
     * Delete deck
     * Delete a deck (soft delete with cascade to flashcards)
     * @param deckId
     * @param token Auth token for image/file requests
     * @returns app__api__rest__uploads__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteDeckApiV1DecksDeckIdDelete(
        deckId: number,
        token?: (string | null),
    ): CancelablePromise<app__api__rest__uploads__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/decks/{deck_id}',
            path: {
                'deck_id': deckId,
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
     * List deck cards
     * Get all flashcards in a deck
     * @param deckId
     * @param page Page number
     * @param pageSize Items per page
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static listDeckCardsApiV1DecksDeckIdCardsGet(
        deckId: number,
        page: number = 1,
        pageSize: number = 100,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/decks/{deck_id}/cards',
            path: {
                'deck_id': deckId,
            },
            query: {
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
     * Generate flashcards from document
     * Use AI to generate flashcards from a document
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns FlashcardGenerateResponse Successful Response
     * @throws ApiError
     */
    public static generateFlashcardsApiV1DecksGeneratePost(
        requestBody: FlashcardGenerateRequest,
        token?: (string | null),
    ): CancelablePromise<FlashcardGenerateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks/generate',
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
     * Generate flashcards from topic
     * Use AI to generate flashcards from any topic
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns FlashcardGenerateResponse Successful Response
     * @throws ApiError
     */
    public static generateFlashcardsFromTopicApiV1DecksGenerateFromTopicPost(
        requestBody: FlashcardGenerateFromTopicRequest,
        token?: (string | null),
    ): CancelablePromise<FlashcardGenerateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks/generate-from-topic',
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
     * Import flashcards
     * Bulk import flashcards into a deck
     * @param deckId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ImportResult Successful Response
     * @throws ApiError
     */
    public static importFlashcardsApiV1DecksDeckIdImportPost(
        deckId: number,
        requestBody: ImportRequest,
        token?: (string | null),
    ): CancelablePromise<ImportResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks/{deck_id}/import',
            path: {
                'deck_id': deckId,
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
     * Create flashcard
     * Create a new flashcard in a deck
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static createCardApiV1CardsPost(
        requestBody: FlashcardCreate,
        token?: (string | null),
    ): CancelablePromise<FlashcardResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cards',
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
     * Get due cards
     * Retrieve cards due for review
     * @param deckId Filter by deck
     * @param limit Maximum cards to return
     * @param token Auth token for image/file requests
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static getDueCardsApiV1CardsDueGet(
        deckId?: (number | null),
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<FlashcardResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cards/due',
            query: {
                'deck_id': deckId,
                'limit': limit,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Review card
     * Submit a review for a flashcard (SM-2 algorithm via SQL)
     * @param cardId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns ReviewResult Successful Response
     * @throws ApiError
     */
    public static reviewCardApiV1CardsCardIdReviewPost(
        cardId: number,
        requestBody: ReviewSubmit,
        token?: (string | null),
    ): CancelablePromise<ReviewResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cards/{card_id}/review',
            path: {
                'card_id': cardId,
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
     * Get flashcard
     * Retrieve a specific flashcard
     * @param cardId
     * @param token Auth token for image/file requests
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static getCardApiV1CardsCardIdGet(
        cardId: number,
        token?: (string | null),
    ): CancelablePromise<FlashcardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cards/{card_id}',
            path: {
                'card_id': cardId,
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
     * Update flashcard
     * Update an existing flashcard
     * @param cardId
     * @param requestBody
     * @param token Auth token for image/file requests
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static updateCardApiV1CardsCardIdPut(
        cardId: number,
        requestBody: FlashcardUpdate,
        token?: (string | null),
    ): CancelablePromise<FlashcardResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/cards/{card_id}',
            path: {
                'card_id': cardId,
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
     * Delete flashcard
     * Delete a flashcard (soft delete)
     * @param cardId
     * @param token Auth token for image/file requests
     * @returns app__api__rest__uploads__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteCardApiV1CardsCardIdDelete(
        cardId: number,
        token?: (string | null),
    ): CancelablePromise<app__api__rest__uploads__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/cards/{card_id}',
            path: {
                'card_id': cardId,
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
