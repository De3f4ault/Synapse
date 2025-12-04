import { z } from 'zod';

/**
 * Flashcard Schema for Creating Cards
 */
export const flashcardCreateSchema = z.object({
    deck_id: z.number().int().positive('Deck ID must be a positive integer'),
                                              front_text: z
                                              .string()
                                              .min(1, 'Front text is required')
                                              .max(5000, 'Front text must be less than 5000 characters'),
                                              back_text: z
                                              .string()
                                              .min(1, 'Back text is required')
                                              .max(5000, 'Back text must be less than 5000 characters'),
                                              front_media_url: z
                                              .string()
                                              .url('Must be a valid URL')
                                              .optional()
                                              .nullable()
                                              .or(z.literal('')),
                                              back_media_url: z
                                              .string()
                                              .url('Must be a valid URL')
                                              .optional()
                                              .nullable()
                                              .or(z.literal('')),
});

export type FlashcardCreateInput = z.infer<typeof flashcardCreateSchema>;

/**
 * Flashcard Schema for Updating Cards
 */
export const flashcardUpdateSchema = z.object({
    front_text: z
    .string()
    .min(1, 'Front text is required')
    .max(5000, 'Front text must be less than 5000 characters')
    .optional(),
                                              back_text: z
                                              .string()
                                              .min(1, 'Back text is required')
                                              .max(5000, 'Back text must be less than 5000 characters')
                                              .optional(),
                                              front_media_url: z
                                              .string()
                                              .url('Must be a valid URL')
                                              .optional()
                                              .nullable()
                                              .or(z.literal('')),
                                              back_media_url: z
                                              .string()
                                              .url('Must be a valid URL')
                                              .optional()
                                              .nullable()
                                              .or(z.literal('')),
});

export type FlashcardUpdateInput = z.infer<typeof flashcardUpdateSchema>;

/**
 * Deck Schema for Creating Decks
 */
export const deckCreateSchema = z.object({
    name: z
    .string()
    .min(1, 'Deck name is required')
    .max(200, 'Deck name must be less than 200 characters'),
                                         description: z
                                         .string()
                                         .max(1000, 'Description must be less than 1000 characters')
                                         .optional()
                                         .nullable()
                                         .or(z.literal('')),
                                         tags: z
                                         .array(z.string().max(50, 'Tag must be less than 50 characters'))
                                         .max(10, 'Maximum 10 tags allowed')
                                         .optional()
                                         .nullable(),
                                         is_public: z.boolean().default(false),
});

export type DeckCreateInput = z.infer<typeof deckCreateSchema>;

/**
 * Deck Schema for Updating Decks
 */
export const deckUpdateSchema = z.object({
    name: z
    .string()
    .min(1, 'Deck name is required')
    .max(200, 'Deck name must be less than 200 characters')
    .optional(),
                                         description: z
                                         .string()
                                         .max(1000, 'Description must be less than 1000 characters')
                                         .optional()
                                         .nullable()
                                         .or(z.literal('')),
                                         tags: z
                                         .array(z.string().max(50, 'Tag must be less than 50 characters'))
                                         .max(10, 'Maximum 10 tags allowed')
                                         .optional()
                                         .nullable(),
                                         is_public: z.boolean().optional(),
});

export type DeckUpdateInput = z.infer<typeof deckUpdateSchema>;
