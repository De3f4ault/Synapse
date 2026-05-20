/**
 * Application-wide constants.
 * Unified + merged from both versions.
 */

// =============================================================================
// API Configuration
// =============================================================================

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "";

export const WS_BASE_URL = import.meta.env.VITE_WS_URL || (typeof window !== "undefined" ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}` : (typeof window !== "undefined" ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}` : "ws://localhost:8000"));

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REGISTER: "/api/v1/auth/register",
    LOGOUT: "/api/v1/auth/logout",
    REFRESH: "/api/v1/auth/refresh",
    ME: "/api/v1/auth/me",
  },
  DECKS: "/api/v1/decks",
  CARDS: "/api/v1/cards",
  NOTES: "/api/v1/notes",
  DOCUMENTS: "/api/v1/documents",
  QUIZZES: "/api/v1/quizzes",
  CHAT: "/api/v1/chat/sessions",
  STUDY: "/api/v1/study",
  ANALYTICS: "/api/v1/analytics",
  SEARCH: "/api/v1/search",
} as const;

// =============================================================================
// Pagination
// =============================================================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  CARDS_PER_REVIEW: 20,
  CHUNKS_PER_PAGE: 50,
} as const;

// =============================================================================
// Flashcard SM-2 Algorithm
// =============================================================================

export const SM2 = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  MAX_EASE_FACTOR: 3.0,
  QUALITY: {
    COMPLETE_BLACKOUT: 0,
    INCORRECT_REMEMBERED: 1,
    INCORRECT_EASY_RECALL: 2,
    CORRECT_DIFFICULT: 3,
    CORRECT_HESITATION: 4,
    PERFECT: 5,
  },
  PASS_THRESHOLD: 3,
} as const;

// =============================================================================
// Document Processing
// =============================================================================

export const DOCUMENTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ACCEPTED_TYPES: {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "application/epub+zip": [".epub"],
  },
  STATUS_POLL_INTERVAL: 2000,
  SIZE_WARNING_THRESHOLD: 10 * 1024 * 1024, // 10MB
} as const;

// =============================================================================
// File Upload (Merged extra config)
// =============================================================================

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  ALLOWED_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/markdown",
  ],
} as const;

// =============================================================================
// Chat & WebSocket
// =============================================================================

export const CHAT = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  PING_INTERVAL: 30000,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 10000,
} as const;

// =============================================================================
// Notes
// =============================================================================

export const NOTES = {
  MAX_TITLE_LENGTH: 500,
  AUTO_SAVE_DELAY: 2000,
  FORMATS: ["markdown", "html", "plain"] as const,
} as const;

// =============================================================================
// Quizzes
// =============================================================================

export const QUIZZES = {
  QUESTION_TYPES: ["multiple_choice", "true_false", "short_answer"] as const,
  DIFFICULTIES: ["easy", "medium", "hard"] as const,
  MAX_QUESTIONS: 50,
  DEFAULT_TIME_LIMIT: 30,
} as const;

// =============================================================================
// Analytics
// =============================================================================

export const ANALYTICS = {
  DEFAULT_TREND_DAYS: 30,
  DEFAULT_HEATMAP_DAYS: 365,
  WEAK_AREA_THRESHOLD: 0.5,
  MASTERY_THRESHOLD: 0.85,
} as const;

// =============================================================================
// UI Configuration
// =============================================================================

export const UI = {
  TOAST_DURATION: 5000,
  SEARCH_DEBOUNCE: 500,
  SIDEBAR_WIDTH: 256,
  SIDEBAR_COLLAPSED_WIDTH: 64,
  PREVIEW_SIDEBAR_WIDTH: 350,
  MAX_MESSAGE_WIDTH: 800,
  MOBILE_BREAKPOINT: 768,
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    CARD_FLIP: 600,
  },
} as const;

// =============================================================================
// Local Storage Keys
// =============================================================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: "synapse_auth_token",
  REFRESH_TOKEN: "synapse_refresh_token",
  THEME: "synapse_theme",
  USER_PREFERENCES: "user_preferences",
  SIDEBAR_COLLAPSED: "synapse_sidebar_collapsed",
  LAST_DECK_ID: "synapse_last_deck_id",
  REVIEW_SETTINGS: "synapse_review_settings",
  EDITOR_PREFERENCES: "synapse_editor_preferences",
} as const;

// =============================================================================
// Query Keys (TanStack Query)
// =============================================================================

export const QUERY_KEYS = {
  AUTH: {
    USER: ["auth", "user"],
  },
  DECKS: {
    ALL: ["decks"],
    DETAIL: (id: number) => ["decks", id],
  },
  CARDS: {
    DUE: (deckId?: number) => ["cards", "due", deckId],
    DETAIL: (id: number) => ["cards", id],
  },
  NOTES: {
    ALL: ["notes"],
    TREE: ["notes", "tree"],
    DETAIL: (id: number) => ["notes", id],
    VERSIONS: (id: number) => ["notes", id, "versions"],
    SEARCH: (query: string) => ["notes", "search", query],
  },
  DOCUMENTS: {
    ALL: ["documents"],
    DETAIL: (id: number) => ["documents", id],
    STATUS: (id: number) => ["documents", id, "status"],
    CHUNKS: (id: number) => ["documents", id, "chunks"],
  },
  QUIZZES: {
    ALL: ["quizzes"],
    DETAIL: (id: number) => ["quizzes", id],
    ATTEMPT: (id: number) => ["quizzes", "attempt", id],
  },
  CHAT: {
    SESSIONS: ["chat", "sessions"],
    SESSION: (id: number) => ["chat", "sessions", id],
    MESSAGES: (sessionId: number) => [
      "chat",
      "sessions",
      sessionId,
      "messages",
    ],
  },
  STUDY: {
    DUE: ["study", "due"],
    SESSIONS: ["study", "sessions"],
    SESSION: (id: number) => ["study", "sessions", id],
    RECOMMENDATIONS: ["study", "recommendations"],
  },
  ANALYTICS: {
    OVERVIEW: ["analytics", "overview"],
    WEAK_AREAS: ["analytics", "weak-areas"],
    PERFORMANCE: (days: number) => ["analytics", "performance", days],
    HEATMAP: (days: number) => ["analytics", "heatmap", days],
    TOPICS: ["analytics", "topics"],
  },
  SEARCH: {
    RESULTS: (query: string, type: string) => ["search", query, type],
    SUGGESTIONS: (query: string) => ["search", "suggestions", query],
  },
  // Merged simplified keys
  CHAT_SESSIONS: "chat-sessions",
  CHAT_SESSION: "chat-session",
  CHAT_MESSAGES: "chat-messages",
} as const;

// =============================================================================
// Routes
// =============================================================================

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  DECKS: "/flashcards",
  DECK_DETAIL: (id: number | string) => `/flashcards/${id}`,
  REVIEW: (deckId?: number | string) =>
    deckId ? `/flashcards/${deckId}/review` : "/flashcards/review",
  NOTES: "/notes",
  NOTE_DETAIL: (id: number | string) => `/notes/${id}`,
  DOCUMENTS: "/documents",
  QUIZZES: "/quizzes",
  QUIZ_TAKE: (id: number | string) => `/quizzes/${id}/take`,
  CHAT: "/chat",
  ANALYTICS: "/analytics",
} as const;
