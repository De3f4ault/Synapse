/**
 * Flashcards Module - Type Definitions
 * Comprehensive types for the Mnemosyne Protocol
 */

// ==================== CORE TYPES ====================

export interface Deck {
  id: number;
  name: string;
  description: string | null;
  card_count: number;
  created_at: string;
  updated_at: string;
  tags?: string[] | null;
  is_public?: boolean;
  user_id?: number;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  front_text: string;
  back_text: string;
  front_media_url?: string | null;
  back_media_url?: string | null;
  learning_state: LearningState;
  // API returns ease_factor, not easiness_factor
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  // API returns next_review, not next_review_date
  next_review?: string | null;
  last_review?: string | null;
  accuracy?: number;
  times_reviewed?: number;
  created_at?: string;
  // Additional computed fields from get_due_cards()
  deck_name?: string | null;
  overdue_days?: number | null;
  priority_score?: number | null;
}

export type LearningState = "new" | "learning" | "review" | "mastered";

// ==================== FORM INPUTS ====================

export interface DeckCreateInput {
  name: string;
  description?: string | null;
  tags?: string[] | null;
  is_public?: boolean;
}

export interface DeckUpdateInput {
  name?: string;
  description?: string | null;
  tags?: string[] | null;
  is_public?: boolean;
}

export interface FlashcardCreateInput {
  deck_id: number;
  front_text: string;
  back_text: string;
  front_media_url?: string | null;
  back_media_url?: string | null;
}

export interface FlashcardUpdateInput {
  front_text?: string;
  back_text?: string;
  front_media_url?: string | null;
  back_media_url?: string | null;
}

// ==================== REVIEW SYSTEM ====================

export type ReviewQuality = "again" | "hard" | "good" | "easy";

export interface ReviewSubmission {
  quality: 0 | 1 | 3 | 5; // Maps to: again, hard, good, easy
  time_taken_ms: number;
}

export interface ReviewSession {
  deckId?: number;
  cards: Flashcard[];
  currentIndex: number;
  completed: number;
  correct: number;
  incorrect: number;
  startTime: number;
  endTime?: number;
}

export interface ReviewResult {
  card: Flashcard;
  quality: ReviewQuality;
  timeTaken: number;
  wasCorrect: boolean;
}

// ==================== STATISTICS ====================

export interface DeckStats {
  totalCards: number;
  dueCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  masteredCards: number;
  masteryPercent: number;
  averageAccuracy: number;
  lastReviewDate?: string;
}

export interface SessionStats {
  totalReviewed: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  duration: number; // in seconds
  cardsPerMinute: number;
}

// ==================== SPACED REPETITION ====================

export interface SM2Parameters {
  easinessFactor: number;
  interval: number;
  repetitions: number;
}

export interface SM2Result extends SM2Parameters {
  nextReviewDate: Date;
}

// ==================== UI STATE ====================

export interface CardFlipState {
  isFlipped: boolean;
  canFlip: boolean;
}

export interface SwipeGestureState {
  x: number;
  y: number;
  isDragging: boolean;
  startX: number;
  startY: number;
}

export type DeckColor =
  | "cyan"
  | "purple"
  | "red"
  | "emerald"
  | "amber"
  | "blue";

export interface DeckColorScheme {
  border: string;
  hoverBorder: string;
  gradient: string;
  dot: string;
  text: string;
  progress: string;
  button: string;
  shadow: string;
}

// ==================== FILTERS & SORTING ====================

export type DeckSortBy = "name" | "created" | "updated" | "cards" | "mastery";
export type SortOrder = "asc" | "desc";

export interface DeckFilters {
  searchQuery?: string;
  tags?: string[];
  isPublic?: boolean;
  sortBy?: DeckSortBy;
  sortOrder?: SortOrder;
}

export type CardSortBy = "created" | "next_review" | "accuracy" | "state";

export interface CardFilters {
  learningState?: LearningState[];
  sortBy?: CardSortBy;
  sortOrder?: SortOrder;
}

// ==================== ANALYTICS ====================

export interface ReviewHistory {
  date: string;
  cardsReviewed: number;
  accuracy: number;
  duration: number;
}

export interface MasteryBreakdown {
  new: number;
  learning: number;
  review: number;
  mastered: number;
}

export interface PerformanceMetrics {
  totalReviews: number;
  averageAccuracy: number;
  streakDays: number;
  totalTimeSpent: number;
  cardsPerDay: number;
  currentMomentum: "increasing" | "stable" | "decreasing";
}
