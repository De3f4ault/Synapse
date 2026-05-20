/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_deck_csv_api_v1_decks__deck_id__import_csv_post } from '../models/Body_import_deck_csv_api_v1_decks__deck_id__import_csv_post';
import type { DeckCreate } from '../models/DeckCreate';
import type { DeckResponse } from '../models/DeckResponse';
import type { DeckUpdate } from '../models/DeckUpdate';
import type { DueCardResponse } from '../models/DueCardResponse';
import type { FlashcardCreate } from '../models/FlashcardCreate';
import type { FlashcardGenerateFromTopicRequest } from '../models/FlashcardGenerateFromTopicRequest';
import type { FlashcardGenerateRequest } from '../models/FlashcardGenerateRequest';
import type { FlashcardGenerateResponse } from '../models/FlashcardGenerateResponse';
import type { FlashcardUpdate } from '../models/FlashcardUpdate';
import type { ImportRequest } from '../models/ImportRequest';
import type { ImportResult } from '../models/ImportResult';
import type { MessageResponse } from '../models/MessageResponse';
import type { ReviewResult } from '../models/ReviewResult';
import type { ReviewSubmit } from '../models/ReviewSubmit';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FlashcardsService {
    /**
     * List Decks
     * List user's decks with card counts and due counts.
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
     * Create Deck
     * Create a new flashcard deck.
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
     * Get Deck
     * Retrieve a specific deck by ID.
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
     * Update Deck
     * Update an existing deck.
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
     * Delete Deck
     * Delete a deck (soft delete with cascade to flashcards).
     * @param deckId
     * @param token Auth token for image/file requests
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteDeckApiV1DecksDeckIdDelete(
        deckId: number,
        token?: (string | null),
    ): CancelablePromise<MessageResponse> {
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
     * List Deck Cards
     * Get all flashcards in a deck.
     * @param deckId
     * @param page
     * @param pageSize
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
     * Generate Flashcards
     * Generate flashcards from a document using AI.
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
     * Generate Flashcards From Topic
     * Generate flashcards from a topic using AI.
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
     * Import Flashcards
     * Bulk import flashcards into a deck.
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
     * Export Deck (JSON)
     * Export a deck and all its flashcards as JSON.
     *
     * The output format is re-importable via POST /{deck_id}/import.
     * @param deckId
     * @param includeStats Include review statistics per card
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportDeckApiV1DecksDeckIdExportGet(
        deckId: number,
        includeStats: boolean = true,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/decks/{deck_id}/export',
            path: {
                'deck_id': deckId,
            },
            query: {
                'include_stats': includeStats,
                'token': token,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Export Deck (CSV)
     * Export a deck's flashcards as CSV.
     *
     * Returns a downloadable CSV file with columns:
     * front_text, back_text, front_media_url, back_media_url,
     * ease_factor, interval, learning_state.
     * @param deckId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportDeckCsvEndpointApiV1DecksDeckIdExportCsvGet(
        deckId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/decks/{deck_id}/export/csv',
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
     * Import Deck Csv
     * Import flashcards from a CSV file.
     *
     * Expects columns: front_text (required), back_text (required),
     * front_media_url (optional), back_media_url (optional).
     * @param deckId
     * @param formData
     * @param token Auth token for image/file requests
     * @returns ImportResult Successful Response
     * @throws ApiError
     */
    public static importDeckCsvApiV1DecksDeckIdImportCsvPost(
        deckId: number,
        formData: Body_import_deck_csv_api_v1_decks__deck_id__import_csv_post,
        token?: (string | null),
    ): CancelablePromise<ImportResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/decks/{deck_id}/import/csv',
            path: {
                'deck_id': deckId,
            },
            query: {
                'token': token,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
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
     * @returns DueCardResponse Successful Response
     * @throws ApiError
     */
    public static createCardApiV1CardsPost(
        requestBody: FlashcardCreate,
        token?: (string | null),
    ): CancelablePromise<DueCardResponse> {
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
     * @returns DueCardResponse Successful Response
     * @throws ApiError
     */
    public static getDueCardsApiV1CardsDueGet(
        deckId?: (number | null),
        limit: number = 20,
        token?: (string | null),
    ): CancelablePromise<Array<DueCardResponse>> {
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
     * @returns DueCardResponse Successful Response
     * @throws ApiError
     */
    public static getCardApiV1CardsCardIdGet(
        cardId: number,
        token?: (string | null),
    ): CancelablePromise<DueCardResponse> {
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
     * @returns DueCardResponse Successful Response
     * @throws ApiError
     */
    public static updateCardApiV1CardsCardIdPut(
        cardId: number,
        requestBody: FlashcardUpdate,
        token?: (string | null),
    ): CancelablePromise<DueCardResponse> {
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
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static deleteCardApiV1CardsCardIdDelete(
        cardId: number,
        token?: (string | null),
    ): CancelablePromise<MessageResponse> {
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
    /**
     * Open (or resume) a Card Tutor session for a flashcard
     * Get or create a Card Tutor chat session anchored to a specific flashcard.
     *
     * Returns:
     * session_id — pass to POST /chat/sessions/{id}/stream to start streaming
     * system_prompt — pre-built context to inject at session start
     * is_new — whether this is a fresh session or a resumed one
     * opening_message — the AI's opening Socratic question (shown immediately,
     * before the student types anything)
     *
     * The frontend flow:
     * 1. Student fails a card (quality ≤ 2) → gap signal filed automatically
     * 2. "Need Help?" button appears
     * 3. POST /cards/{card_id}/tutor  → get session_id + opening_message
     * 4. Render the opening_message in the side-panel chat
     * 5. Student types → stream to POST /chat/sessions/{session_id}/stream
     * with card_id in the request body
     * @param cardId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static openCardTutorApiV1CardsCardIdTutorPost(
        cardId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cards/{card_id}/tutor',
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
     * Get all Card Tutor sessions for a flashcard
     * Return all Card Tutor conversations the user has had for a specific card.
     *
     * Useful for the frontend to show "You discussed this concept 3 times"
     * with links to each session for review.
     * @param cardId
     * @param token Auth token for image/file requests
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getCardTutorHistoryApiV1CardsCardIdTutorHistoryGet(
        cardId: number,
        token?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cards/{card_id}/tutor/history',
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
