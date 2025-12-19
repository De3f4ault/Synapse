/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__api__rest__links__MessageResponse } from '../models/app__api__rest__links__MessageResponse';
import type { DeckCreate } from '../models/DeckCreate';
import type { DeckResponse } from '../models/DeckResponse';
import type { DeckUpdate } from '../models/DeckUpdate';
import type { FlashcardCreate } from '../models/FlashcardCreate';
import type { FlashcardGenerateFromTopicRequest } from '../models/FlashcardGenerateFromTopicRequest';
import type { FlashcardGenerateRequest } from '../models/FlashcardGenerateRequest';
import type { FlashcardGenerateResponse } from '../models/FlashcardGenerateResponse';
import type { FlashcardResponse } from '../models/FlashcardResponse';
import type { FlashcardUpdate } from '../models/FlashcardUpdate';
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
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static listDecksApiV1DecksGet(
        tags?: (string | null),
        isPublic?: (boolean | null),
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<Array<DeckResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/decks',
            query: {
                'tags': tags,
                'is_public': isPublic,
                'page': page,
                'page_size': pageSize,
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
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static createDeckApiV1DecksPost(
        requestBody: DeckCreate,
    ): CancelablePromise<DeckResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks',
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
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static getDeckApiV1DecksDeckIdGet(
        deckId: number,
    ): CancelablePromise<DeckResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/decks/{deck_id}',
            path: {
                'deck_id': deckId,
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
     * @returns DeckResponse Successful Response
     * @throws ApiError
     */
    public static updateDeckApiV1DecksDeckIdPut(
        deckId: number,
        requestBody: DeckUpdate,
    ): CancelablePromise<DeckResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/decks/{deck_id}',
            path: {
                'deck_id': deckId,
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
     * Delete a deck (soft delete)
     * @param deckId
     * @returns app__api__rest__links__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteDeckApiV1DecksDeckIdDelete(
        deckId: number,
    ): CancelablePromise<app__api__rest__links__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/decks/{deck_id}',
            path: {
                'deck_id': deckId,
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
     * @returns FlashcardGenerateResponse Successful Response
     * @throws ApiError
     */
    public static generateFlashcardsApiV1DecksGeneratePost(
        requestBody: FlashcardGenerateRequest,
    ): CancelablePromise<FlashcardGenerateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks/generate',
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
     * @returns FlashcardGenerateResponse Successful Response
     * @throws ApiError
     */
    public static generateFlashcardsFromTopicApiV1DecksGenerateFromTopicPost(
        requestBody: FlashcardGenerateFromTopicRequest,
    ): CancelablePromise<FlashcardGenerateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks/generate-from-topic',
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
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static createCardApiV1CardsPost(
        requestBody: FlashcardCreate,
    ): CancelablePromise<FlashcardResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cards',
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
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static getDueCardsApiV1CardsDueGet(
        deckId?: (number | null),
        limit: number = 20,
    ): CancelablePromise<Array<FlashcardResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cards/due',
            query: {
                'deck_id': deckId,
                'limit': limit,
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
     * @returns ReviewResult Successful Response
     * @throws ApiError
     */
    public static reviewCardApiV1CardsCardIdReviewPost(
        cardId: number,
        requestBody: ReviewSubmit,
    ): CancelablePromise<ReviewResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cards/{card_id}/review',
            path: {
                'card_id': cardId,
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
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static getCardApiV1CardsCardIdGet(
        cardId: number,
    ): CancelablePromise<FlashcardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cards/{card_id}',
            path: {
                'card_id': cardId,
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
     * @returns FlashcardResponse Successful Response
     * @throws ApiError
     */
    public static updateCardApiV1CardsCardIdPut(
        cardId: number,
        requestBody: FlashcardUpdate,
    ): CancelablePromise<FlashcardResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/cards/{card_id}',
            path: {
                'card_id': cardId,
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
     * @returns app__api__rest__links__MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteCardApiV1CardsCardIdDelete(
        cardId: number,
    ): CancelablePromise<app__api__rest__links__MessageResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/cards/{card_id}',
            path: {
                'card_id': cardId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
