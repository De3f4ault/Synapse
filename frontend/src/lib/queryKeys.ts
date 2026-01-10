/**
 * Query Keys Factory
 *
 * Centralized, type-safe query key management for TanStack Query.
 * Provides consistent cache keys across the application.
 *
 * Usage:
 * - useQuery({ queryKey: queryKeys.decks.list({ status: 'active' }) })
 * - queryClient.invalidateQueries({ queryKey: queryKeys.decks.all })
 */

export const queryKeys = {
  // Authentication
  auth: {
    all: ["auth"] as const,
    user: () => [...queryKeys.auth.all, "user"] as const,
  },

  // Flashcards
  flashcards: {
    all: ["flashcards"] as const,
    lists: () => [...queryKeys.flashcards.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.flashcards.lists(), filters] as const,
    details: () => [...queryKeys.flashcards.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.flashcards.details(), id] as const,
    due: (filters?: Record<string, unknown>) =>
      [...queryKeys.flashcards.all, "due", filters] as const,

    // ✅ ADDED FROM FIX 4
    cards: (deckId: number) =>
      [...queryKeys.flashcards.all, "deck", deckId, "cards"] as const,
  },

  // Decks
  decks: {
    all: ["decks"] as const,
    lists: () => [...queryKeys.decks.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.decks.lists(), filters] as const,
    details: () => [...queryKeys.decks.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.decks.details(), id] as const,
    cards: (deckId: number) =>
      [...queryKeys.decks.detail(deckId), "cards"] as const,
  },

  // Notes
  notes: {
    all: ["notes"] as const,
    lists: () => [...queryKeys.notes.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.notes.lists(), filters] as const,
    details: () => [...queryKeys.notes.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.notes.details(), id] as const,
    tree: () => [...queryKeys.notes.all, "tree"] as const,
    search: (query: string) =>
      [...queryKeys.notes.all, "search", query] as const,
    versions: (noteId: number) =>
      [...queryKeys.notes.detail(noteId), "versions"] as const,
  },

  // Documents
  documents: {
    all: ["documents"] as const,
    lists: () => [...queryKeys.documents.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.documents.lists(), filters] as const,
    details: () => [...queryKeys.documents.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.documents.details(), id] as const,
    chunks: (docId: number) =>
      [...queryKeys.documents.detail(docId), "chunks"] as const,
    status: (docId: number) =>
      [...queryKeys.documents.detail(docId), "status"] as const,
  },

  // Chat
  chat: {
    all: ["chat"] as const,
    sessions: () => [...queryKeys.chat.all, "sessions"] as const,
    session: (id: number) => [...queryKeys.chat.sessions(), id] as const,
    messages: (sessionId: number) =>
      [...queryKeys.chat.session(sessionId), "messages"] as const,
  },

  // Quizzes
  quizzes: {
    all: ["quizzes"] as const,
    lists: () => [...queryKeys.quizzes.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.quizzes.lists(), filters] as const,
    details: () => [...queryKeys.quizzes.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.quizzes.details(), id] as const,
    attempt: (attemptId: number) =>
      [...queryKeys.quizzes.all, "attempt", attemptId] as const,
  },

  // Analytics
  analytics: {
    all: ["analytics"] as const,
    overview: () => [...queryKeys.analytics.all, "overview"] as const,
    weakAreas: () => [...queryKeys.analytics.all, "weak-areas"] as const,
    performance: (days: number) =>
      [...queryKeys.analytics.all, "performance", days] as const,
    heatmap: (days: number) =>
      [...queryKeys.analytics.all, "heatmap", days] as const,
    topics: () => [...queryKeys.analytics.all, "topics"] as const,
  },

  // Study
  study: {
    all: ["study"] as const,
    due: () => [...queryKeys.study.all, "due"] as const,
    recommendations: () => [...queryKeys.study.all, "recommendations"] as const,
    sessions: () => [...queryKeys.study.all, "sessions"] as const,
    session: (id: number) => [...queryKeys.study.sessions(), id] as const,
  },

  // Search
  search: {
    all: ["search"] as const,
    results: (query: string, filters?: Record<string, unknown>) =>
      [...queryKeys.search.all, "results", query, filters] as const,
    suggestions: (query: string) =>
      [...queryKeys.search.all, "suggestions", query] as const,
  },
} as const;

/**
 * Type helper to extract query key type
 * Usage: type DeckListKey = QueryKey<typeof queryKeys.decks.list>;
 */
export type QueryKey<T> = T extends (...args: any[]) => infer R ? R : T;
