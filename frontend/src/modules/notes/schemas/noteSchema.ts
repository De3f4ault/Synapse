import { z } from "zod";
import { NOTES } from "@/lib/constants";

/**
 * Notes Module - Validation Schemas
 *
 * Zod schemas for note operations.
 * Extends the base validators from @/lib/validators.ts
 */

// =============================================================================
// Note Schemas
// =============================================================================

/**
 * Note Creation Schema
 * Used for creating new notes
 */
export const noteCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(
      NOTES.MAX_TITLE_LENGTH,
      `Title must be less than ${NOTES.MAX_TITLE_LENGTH} characters`,
    )
    .trim(),
  content: z.string().min(1, "Content is required").trim(),
  format: z.enum(NOTES.FORMATS).default("markdown"),
  parent_id: z.number().int().positive().optional().nullable(),
  tags: z
    .array(z.string().max(50, "Tag must be less than 50 characters"))
    .max(10, "Maximum 10 tags allowed")
    .optional()
    .nullable(),
});

/**
 * Note Update Schema
 * Used for updating existing notes (all fields optional)
 */
export const noteUpdateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(
      NOTES.MAX_TITLE_LENGTH,
      `Title must be less than ${NOTES.MAX_TITLE_LENGTH} characters`,
    )
    .trim()
    .optional()
    .nullable(),
  content: z
    .string()
    .min(1, "Content is required")
    .trim()
    .optional()
    .nullable(),
  format: z.enum(NOTES.FORMATS).optional().nullable(),
});

/**
 * Note Filter Schema
 * Used for filtering note lists
 */
export const noteFilterSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  tags: z.string().optional(), // Comma-separated tags
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

/**
 * Note Search Schema
 * Used for searching notes
 */
export const noteSearchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(200, "Query must be less than 200 characters"),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * Note Move Schema
 * Used for moving notes to different parent
 */
export const noteMoveSchema = z.object({
  noteId: z.number().int().positive("Note ID is required"),
  newParentId: z.number().int().positive().nullable(),
});

/**
 * Version Restore Schema
 * Used for restoring a note version
 */
export const versionRestoreSchema = z.object({
  noteId: z.number().int().positive("Note ID is required"),
  versionId: z.number().int().positive("Version ID is required"),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
export type NoteFilterInput = z.infer<typeof noteFilterSchema>;
export type NoteSearchInput = z.infer<typeof noteSearchSchema>;
export type NoteMoveInput = z.infer<typeof noteMoveSchema>;
export type VersionRestoreInput = z.infer<typeof versionRestoreSchema>;
