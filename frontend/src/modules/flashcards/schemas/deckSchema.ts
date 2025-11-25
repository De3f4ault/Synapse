import { z } from 'zod';

/**
 * Flashcard Module - Validation Schemas
 *
 * Zod schemas for deck and flashcard operations.
 * Extends the base validators from @/lib/validators.ts
 */

// =============================================================================
// Deck Schemas
// =============================================================================

/**
 * Deck Creation Schema
 * Used for creating new flashcard decks
 */
export const deckCreateSchema = z.object({
    name: z
    .string()
    .min(1, 'Deck name is required')
    .max(255, 'Deck name must be less than 255 characters')
    .trim(),
                                         description: z
                                         .string()
                                         .max(1000, 'Description must be less than 1000 characters')
                                         .trim()
                                         .optional()
                                         .nullable(),
                                         tags: z
                                         .array(z.string().max(50, 'Tag must be less than 50 characters'))
                                         .max(10, 'Maximum 10 tags allowed')
                                         .optional()
                                         .nullable(),
                                         is_public: z.boolean().default(false),
});

/**
 * Deck Update Schema
 * Used for updating existing decks (all fields optional)
 */
export const deckUpdateSchema = z.object({
    name: z
    .string()
    .min(1, 'Deck name is required')
    .max(255, 'Deck name must be less than 255 characters')
    .trim()
    .optional()
    .nullable(),
                                         description: z
                                         .string()
                                         .max(1000, 'Description must be less than 1000 characters')
                                         .trim()
                                         .optional()
                                         .nullable(),
                                         tags: z
                                         .array(z.string().max(50, 'Tag must be less than 50 characters'))
                                         .max(10, 'Maximum 10 tags allowed')
                                         .optional()
                                         .nullable(),
                                         is_public: z.boolean().optional().nullable(),
});

/**
 * Deck Filter Schema
 * Used for filtering deck lists
 */
export const deckFilterSchema = z.object({
    isPublic: z.boolean().optional(),
                                         tags: z.string().optional(), // Comma-separated tags
                                         page: z.number().int().positive().default(1),
                                         pageSize: z.number().int().positive().max(100).default(20),
});

// =============================================================================
// Flashcard Schemas
// =============================================================================

/**
 * Flashcard Creation Schema
 * Used for creating individual flashcards
 */
export const flashcardCreateSchema = z.object({
    deck_id: z.number().int().positive('Deck ID is required'),
                                              front_text: z
                                              .string()
                                              .min(1, 'Front text is required')
                                              .max(5000, 'Front text is too long (max 5000 characters)')
                                              .trim(),
                                              back_text: z
                                              .string()
                                              .min(1, 'Back text is required')
                                              .max(5000, 'Back text is too long (max 5000 characters)')
                                              .trim(),
                                              front_media_url: z
                                              .string()
                                              .url('Invalid image URL')
                                              .optional()
                                              .nullable()
                                              .or(z.literal('')), // Allow empty string
                                              back_media_url: z
                                              .string()
                                              .url('Invalid image URL')
                                              .optional()
                                              .nullable()
                                              .or(z.literal('')), // Allow empty string
});

/**
 * Flashcard Update Schema
 * Used for updating existing flashcards
 */
export const flashcardUpdateSchema = flashcardCreateSchema
.omit({ deck_id: true })
.partial();

/**
 * Review Submit Schema
 * Used for submitting flashcard review quality ratings
 */
export const reviewSubmitSchema = z.object({
    quality: z
    .number()
    .int()
    .min(0, 'Quality must be between 0-5')
    .max(5, 'Quality must be between 0-5'),
                                           time_taken_ms: z
                                           .number()
                                           .int()
                                           .min(0, 'Time must be positive')
                                           .max(3600000, 'Time cannot exceed 1 hour'), // Max 1 hour per card
});

/**
 * Flashcard Generation Schema
 * Used for AI-powered flashcard generation from documents
 */
export const flashcardGenerateSchema = z.object({
    document_id: z.number().int().positive('Document ID is required'),
                                                deck_name: z
                                                .string()
                                                .min(1, 'Deck name is required')
                                                .max(255, 'Deck name must be less than 255 characters')
                                                .trim(),
                                                num_cards: z
                                                .number()
                                                .int()
                                                .min(1, 'Minimum 1 card')
                                                .max(50, 'Maximum 50 cards')
                                                .default(10),
                                                difficulty: z
                                                .enum(['easy', 'medium', 'hard'])
                                                .default('medium'),
                                                tags: z
                                                .array(z.string().max(50))
                                                .max(10)
                                                .optional()
                                                .nullable(),
});

/**
 * Bulk Card Delete Schema
 * Used for deleting multiple cards at once
 */
export const bulkDeleteSchema = z.object({
    card_ids: z
    .array(z.number().int().positive())
    .min(1, 'At least one card must be selected')
    .max(100, 'Cannot delete more than 100 cards at once'),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type DeckCreateInput = z.infer<typeof deckCreateSchema>;
export type DeckUpdateInput = z.infer<typeof deckUpdateSchema>;
export type DeckFilterInput = z.infer<typeof deckFilterSchema>;
export type FlashcardCreateInput = z.infer<typeof flashcardCreateSchema>;
export type FlashcardUpdateInput = z.infer<typeof flashcardUpdateSchema>;
export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;
export type FlashcardGenerateInput = z.infer<typeof flashcardGenerateSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
