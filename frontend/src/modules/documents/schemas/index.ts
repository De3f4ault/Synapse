/**
 * Document Schemas - Barrel Export
 *
 * Central export point for all document validation schemas.
 */

export {
  documentUploadSchema,
  documentUpdateSchema,
  documentFlashcardGenerationSchema,
  documentFilterSchema,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  type DocumentUpload,
  type DocumentUpdate,
  type DocumentFlashcardGeneration,
  type DocumentFilter,
} from "./documentSchema";
