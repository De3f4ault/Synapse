/**
 * Flashcards Module - Central Exports
 * Mnemosyne Protocol Interface
 */

// ==================== PAGES ====================
export { DecksPage } from "./DecksPage";
export { DeckDetailPage } from "./DeckDetailPage";
export { ReviewPage } from "./ReviewPage";
export { CreateDeckPage } from "./CreateDeckPage";
export { CreateCardPage } from "./CreateCardPage";
export { EditCardPage } from "./EditCardPage";

// ==================== TYPES ====================
export type {
  Deck,
  Flashcard,
  LearningState,
  DeckCreateInput,
  DeckUpdateInput,
  FlashcardCreateInput,
  FlashcardUpdateInput,
  ReviewQuality,
  ReviewSubmission,
  ReviewSession,
  ReviewResult,
  DeckStats,
  SessionStats,
  SM2Parameters,
  SM2Result,
  DeckColor,
  DeckColorScheme,
  DeckFilters,
  CardFilters,
  MasteryBreakdown,
  PerformanceMetrics,
} from "./types/flashcards.types";

// ==================== HOOKS ====================
export {
  useDecks,
  useDeck,
  useCreateDeck,
  useUpdateDeck,
  useDeleteDeck,
  useDeckStats,
} from "./hooks/useDecks";

export {
  useDeckCards,
  useDueCards,
  useCard,
  useCreateCard,
  useUpdateCard,
  useDeleteCard,
  useBatchCreateCards,
  useCardStats,
} from "./hooks/useCards";

export { useReviewSession, formatTime } from "./hooks/useReviewSession";

// ==================== UTILITIES ====================
export {
  calculateNextReview,
  determineLearningState,
  calculateMastery,
  isCardDue,
  getDueCards,
  calculateDailyTarget,
  sortByReviewPriority,
  getReviewRecommendations,
  calculateSessionLength,
} from "./utils/spacedRepetition";

export {
  calculateCardPriority,
  getDaysOverdue,
  sortCardsByPriority,
  groupCardsByState,
  createBalancedSession,
  calculateSessionStats,
  getNextReviewTime,
  filterByLearningState,
  getCardsDueToday,
  calculateWeeklyProgress,
} from "./utils/cardScheduler";

// ==================== COMPONENTS ====================
export { ReviewStats } from "./components/shared/ReviewStats";
export { SpacedRepetitionInfo } from "./components/shared/SpacedRepetitionInfo";

// Note: Deck, Card, and Review sub-components are not exported
// as they are tightly coupled to their respective pages
