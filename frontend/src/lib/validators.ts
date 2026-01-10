import { z } from "zod";
import { DOCUMENTS, NOTES, CHAT, QUIZZES } from "./constants";

// =============================================================================
// Authentication Schemas
// =============================================================================

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    full_name: z
      .string()
      .min(1, "Full name is required")
      .max(255, "Full name must be less than 255 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "New password must be different from current password",
    path: ["new_password"],
  });

// =============================================================================
// Deck & Flashcard Schemas
// =============================================================================

export const deckCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name must be less than 255 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(10, "Maximum 10 tags allowed")
    .optional(),
  is_public: z.boolean().default(false),
});

export const deckUpdateSchema = deckCreateSchema.partial();

export const flashcardCreateSchema = z.object({
  deck_id: z.number().int().positive("Deck ID is required"),
  front_text: z
    .string()
    .min(1, "Front text is required")
    .max(5000, "Front text is too long"),
  back_text: z
    .string()
    .min(1, "Back text is required")
    .max(5000, "Back text is too long"),
  front_media_url: z.string().url("Invalid URL").optional().nullable(),
  back_media_url: z.string().url("Invalid URL").optional().nullable(),
});

export const reviewSubmitSchema = z.object({
  quality: z
    .number()
    .int()
    .min(0, "Quality must be between 0-5")
    .max(5, "Quality must be between 0-5"),
  time_taken_ms: z.number().int().min(0, "Time must be positive"),
});

export const flashcardGenerateSchema = z.object({
  document_id: z.number().int().positive("Document ID is required"),
  deck_name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name must be less than 255 characters"),
  num_cards: z
    .number()
    .int()
    .min(1, "Minimum 1 card")
    .max(50, "Maximum 50 cards")
    .default(10),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  tags: z.array(z.string()).optional(),
});

// =============================================================================
// Note Schemas
// =============================================================================

export const noteCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(
      NOTES.MAX_TITLE_LENGTH,
      `Title must be less than ${NOTES.MAX_TITLE_LENGTH} characters`,
    ),
  content: z.string().min(1, "Content is required"),
  format: z.enum(NOTES.FORMATS).default("markdown"),
  parent_id: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const noteUpdateSchema = noteCreateSchema.partial();

// =============================================================================
// Document Schemas
// =============================================================================

export const documentUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= DOCUMENTS.MAX_FILE_SIZE,
      `File size must be less than ${DOCUMENTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    )
    .refine((file) => {
      const acceptedTypes = Object.keys(DOCUMENTS.ACCEPTED_TYPES);
      return acceptedTypes.includes(file.type);
    }, "Invalid file type. Accepted: PDF, DOCX, TXT, MD, EPUB"),
});

// =============================================================================
// Quiz Schemas
// =============================================================================

export const questionCreateSchema = z.object({
  question_text: z.string().min(1, "Question text is required").max(2000),
  question_type: z.enum(QUIZZES.QUESTION_TYPES),
  options: z.record(z.unknown()).optional().nullable(),
  correct_answer: z.string().min(1, "Correct answer is required"),
  explanation: z.string().max(2000).optional().nullable(),
  points: z.number().int().min(1).default(1),
});

export const quizCreateSchema = z.object({
  title: z.string().min(1, "Quiz title is required").max(500),
  description: z.string().max(2000).optional().nullable(),
  difficulty: z.enum(QUIZZES.DIFFICULTIES).default("medium"),
  time_limit_minutes: z.number().int().positive().optional().nullable(),
  questions: z
    .array(questionCreateSchema)
    .min(1, "At least one question is required")
    .max(QUIZZES.MAX_QUESTIONS, `Maximum ${QUIZZES.MAX_QUESTIONS} questions`),
});

export const answerSubmitSchema = z.object({
  question_id: z.number().int().positive(),
  answer: z.string().min(1, "Answer is required"),
});

// =============================================================================
// Chat Schemas
// =============================================================================

export const chatSessionCreateSchema = z.object({
  title: z.string().max(500).optional().nullable(),
  document_id: z.number().int().positive().optional().nullable(),
  context_modules: z.array(z.string()).optional().nullable(),
});

export const chatMessageCreateSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(
      CHAT.MAX_MESSAGE_LENGTH,
      `Message must be less than ${CHAT.MAX_MESSAGE_LENGTH} characters`,
    ),
});

// =============================================================================
// Study Session Schemas
// =============================================================================

export const studySessionCreateSchema = z.object({
  session_type: z.enum(["flashcard_review", "quiz", "mixed"]),
  modules: z.array(z.string()).optional(),
});

// =============================================================================
// Search Schemas
// =============================================================================

export const searchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required").max(200),
  modules: z.string().optional(),
  search_type: z.enum(["fts", "semantic", "hybrid"]).default("hybrid"),
  limit: z.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Profile Schemas
// =============================================================================

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(255).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
  preferences: z.record(z.unknown()).optional().nullable(),
});

// =============================================================================
// Webhook Schemas
// =============================================================================

export const webhookCreateSchema = z.object({
  url: z.string().url("Invalid webhook URL").max(2083),
  events: z.array(z.string()).min(1, "At least one event is required"),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
});

export const webhookUpdateSchema = webhookCreateSchema.partial();

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
export type DeckCreateFormData = z.infer<typeof deckCreateSchema>;
export type DeckUpdateFormData = z.infer<typeof deckUpdateSchema>;
export type FlashcardCreateFormData = z.infer<typeof flashcardCreateSchema>;
export type ReviewSubmitFormData = z.infer<typeof reviewSubmitSchema>;
export type FlashcardGenerateFormData = z.infer<typeof flashcardGenerateSchema>;
export type NoteCreateFormData = z.infer<typeof noteCreateSchema>;
export type NoteUpdateFormData = z.infer<typeof noteUpdateSchema>;
export type QuizCreateFormData = z.infer<typeof quizCreateSchema>;
export type QuestionCreateFormData = z.infer<typeof questionCreateSchema>;
export type AnswerSubmitFormData = z.infer<typeof answerSubmitSchema>;
export type ChatSessionCreateFormData = z.infer<typeof chatSessionCreateSchema>;
export type ChatMessageCreateFormData = z.infer<typeof chatMessageCreateSchema>;
export type StudySessionCreateFormData = z.infer<
  typeof studySessionCreateSchema
>;
export type SearchQueryFormData = z.infer<typeof searchQuerySchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type WebhookCreateFormData = z.infer<typeof webhookCreateSchema>;
export type WebhookUpdateFormData = z.infer<typeof webhookUpdateSchema>;
