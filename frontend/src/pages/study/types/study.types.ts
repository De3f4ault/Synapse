/**
 * Study Module Type Definitions
 *
 * Comprehensive types for study sessions, items, recommendations, and analytics
 */

// ============================================================================
// Core Study Item Types
// ============================================================================

export type StudyItemType = "flashcard" | "quiz" | "note" | "document";
export type StudyPriority = "high" | "new" | "normal" | "low";
export type StudySessionType =
  | "flashcard_review"
  | "quiz"
  | "mixed"
  | "due"
  | "recommended";

/**
 * Base study item interface
 */
export interface StudyItem {
  id: number;
  type: StudyItemType;
  title: string;
  module: string; // 'flashcards', 'quizzes', etc.
  priority?: StudyPriority;
  dueDate?: string | null;
  estimatedTime?: number; // minutes
  lastReviewed?: string | null;
  nextReview?: string | null;
  difficulty?: number; // 1-5 scale
  masteryLevel?: number; // 0-100 percentage

  // Flashcard-specific
  deckId?: number;
  learningState?: string; // 'NEW', 'LEARNING', 'REVIEW'

  // Quiz-specific
  questionCount?: number;
  lastScore?: number;
}

/**
 * Recommended study item with AI reasoning
 */
export interface RecommendedItem extends StudyItem {
  reason: string; // Why this is recommended
  confidence: number; // 0-1, how confident the recommendation is
  suggestedDuration: number; // minutes
  relatedTopics?: string[];
}

// ============================================================================
// Study Session Types
// ============================================================================

/**
 * Study session configuration
 */
export interface StudySessionConfig {
  type: StudySessionType;
  items: StudyItem[];
  modules: string[];
  targetDuration?: number; // minutes
  targetItems?: number;
}

/**
 * Study session state
 */
export interface StudySessionState {
  sessionId: number | null;
  config: StudySessionConfig;
  currentItemIndex: number;
  completedItems: number[];
  startTime: Date;
  endTime?: Date;
  stats: StudySessionStats;
}

/**
 * Study session statistics
 */
export interface StudySessionStats {
  totalItems: number;
  completedItems: number;
  correctItems: number;
  accuracy: number; // 0-100 percentage
  timeSpent: number; // seconds
  averageTimePerItem: number; // seconds
}

/**
 * Study session response from API
 */
export interface StudySessionResponse {
  id: number;
  session_type: StudySessionType;
  modules_used: string[];
  items_completed: number;
  items_correct: number;
  accuracy: number;
  time_spent_seconds: number;
  started_at: string;
  ended_at: string | null;
  is_completed: boolean;
}

// ============================================================================
// Learning Path Types
// ============================================================================

/**
 * Structured learning path
 */
export interface LearningPath {
  id: number;
  title: string;
  description: string;
  topics: string[];
  estimatedDuration: number; // hours
  difficulty: "beginner" | "intermediate" | "advanced";
  progress: number; // 0-100 percentage
  nextMilestone?: string;
}

/**
 * Learning path milestone
 */
export interface PathMilestone {
  id: number;
  pathId: number;
  title: string;
  description: string;
  order: number;
  completed: boolean;
  completedAt?: string;
}

// ============================================================================
// Suggested Topics & Weak Areas
// ============================================================================

/**
 * Topic suggestion based on performance
 */
export interface SuggestedTopic {
  topic: string;
  reason: string;
  itemCount: number;
  avgMastery: number; // 0-100
  priority: StudyPriority;
}

/**
 * Weak area identification
 */
export interface WeakArea {
  topic: string;
  accuracy: number; // 0-100
  reviewCount: number;
  severity: "low" | "medium" | "high";
  itemIds: number[];
}

// ============================================================================
// Study Streak & Progress
// ============================================================================

/**
 * Study streak tracking
 */
export interface StudyStreak {
  current: number; // days
  longest: number; // days
  lastStudyDate: string;
  daysStudied: number; // total
  weeklyGoal: number; // days per week
  weeklyProgress: number; // days this week
}

/**
 * Daily study goal
 */
export interface DailyGoal {
  targetMinutes: number;
  currentMinutes: number;
  targetItems: number;
  currentItems: number;
  isComplete: boolean;
}

// ============================================================================
// Analytics & Statistics
// ============================================================================

/**
 * Study performance over time
 */
export interface PerformanceTrend {
  date: string;
  reviewsCount: number;
  accuracy: number;
  studyTimeMinutes: number;
}

/**
 * Topic mastery level
 */
export interface TopicMastery {
  topic: string;
  masteryScore: number; // 0-100
  cardCount: number;
  avgEaseFactor: number;
}

/**
 * Study statistics summary
 */
export interface StudyStatsSummary {
  totalSessions: number;
  totalItems: number;
  totalTime: number; // minutes
  averageAccuracy: number; // 0-100
  currentStreak: number; // days
  itemsDueToday: number;
  itemsDueThisWeek: number;
}

// ============================================================================
// Review & Practice
// ============================================================================

/**
 * Review item response
 */
export interface ReviewResponse {
  quality: number; // 0-5 (SM-2 quality rating)
  timeSpent: number; // milliseconds
  wasCorrect: boolean;
}

/**
 * Practice session result
 */
export interface PracticeResult {
  itemId: number;
  itemType: StudyItemType;
  wasCorrect: boolean;
  timeSpent: number; // seconds
  quality?: number; // 0-5 for flashcards
  answer?: string; // for quizzes
}

// ============================================================================
// Filters & Options
// ============================================================================

/**
 * Study item filter options
 */
export interface StudyFilterOptions {
  modules?: string[]; // ['flashcards', 'quizzes']
  priority?: StudyPriority[];
  difficulty?: number[]; // [1, 2, 3, 4, 5]
  masteryRange?: [number, number]; // [0, 100]
  dueDateRange?: [Date, Date];
  topics?: string[];
}

/**
 * Study session options
 */
export interface StudySessionOptions {
  sessionType: StudySessionType;
  modules?: string[];
  targetDuration?: number; // minutes
  targetItems?: number;
  includeNew?: boolean;
  includeReview?: boolean;
  maxDifficulty?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Study module configuration
 */
export interface StudyModuleConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  weight: number; // for recommendation priority
}

/**
 * Study reminder settings
 */
export interface StudyReminder {
  enabled: boolean;
  time: string; // HH:mm format
  days: number[]; // 0-6 (Sunday-Saturday)
  message: string;
}

/**
 * Study preferences
 */
export interface StudyPreferences {
  dailyGoalMinutes: number;
  weeklyGoalDays: number;
  autoStartSessions: boolean;
  showConfidence: boolean;
  enableReminders: boolean;
  reminders: StudyReminder[];
}

/**
 * Study session status
 */
export type SessionStatus = "active" | "paused" | "completed" | "abandoned";
