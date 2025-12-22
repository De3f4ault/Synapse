import { z } from "zod";

/**
 * Document Schemas
 *
 * Zod validation schemas for document-related operations.
 * Used with react-hook-form for type-safe form validation.
 */

// Accepted file types
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/epub+zip",
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Document upload validation schema
 */
export const documentUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    })
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type as any), {
      message: "Invalid file type. Accepted: PDF, DOCX, TXT, MD, EPUB",
    }),
});

/**
 * Document metadata update schema
 */
export const documentUpdateSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename must be less than 255 characters")
    .optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Flashcard generation from document schema
 */
export const documentFlashcardGenerationSchema = z.object({
  document_id: z.number().positive("Document ID is required"),
  deck_name: z
    .string()
    .min(1, "Deck name is required")
    .max(100, "Deck name must be less than 100 characters"),
  num_cards: z
    .number()
    .int()
    .min(5, "Minimum 5 cards")
    .max(100, "Maximum 100 cards")
    .default(20),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  tags: z.array(z.string()).optional(),
});

/**
 * Document search/filter schema
 */
export const documentFilterSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  file_type: z.string().optional(),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
});

// TypeScript types inferred from schemas
export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;
export type DocumentFlashcardGeneration = z.infer<
  typeof documentFlashcardGenerationSchema
>;
export type DocumentFilter = z.infer<typeof documentFilterSchema>;
