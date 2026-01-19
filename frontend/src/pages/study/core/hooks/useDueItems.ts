import { useQuery } from "@tanstack/react-query";
import { StudyService } from "@/api/generated";
import type { StudyItemResponse } from "@/api/generated";
import { QUERY_KEYS } from "@/lib/constants";
import type {
  StudyItem,
  StudyItemType,
  StudyPriority,
} from "../engine/types";

/**
 * Hook for fetching due study items
 *
 * Fetches items that need review from various modules (flashcards, quizzes)
 * prioritized by due date and performance metrics.
 */
export function useDueItems(modules?: string, limit: number = 20) {
  return useQuery({
    queryKey: [...QUERY_KEYS.STUDY.DUE, modules, limit],
    queryFn: async () => {
      const response = await StudyService.getDueItemsApiV1StudyDueGet(
        modules,
        limit,
      );

      // Transform API response to internal StudyItem format
      return response.map(transformStudyItem);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching due items statistics
 * Returns aggregate stats without fetching full item data
 */
export function useDueItemsStats() {
  const { data: items, isLoading } = useDueItems("flashcards,quizzes", 100);

  if (isLoading || !items) {
    return {
      total: 0,
      flashcards: 0,
      quizzes: 0,
      overdue: 0,
      new: 0,
    };
  }

  return {
    total: items.length,
    flashcards: items.filter((i) => i.type === "flashcard").length,
    quizzes: items.filter((i) => i.type === "quiz").length,
    overdue: items.filter((i) => i.priority === "high").length,
    new: items.filter((i) => i.priority === "new").length,
  };
}

/**
 * Transform API response to internal StudyItem format
 */
function transformStudyItem(item: StudyItemResponse): StudyItem {
  const baseItem = {
    id: item.id,
    type: item.type as StudyItemType,
    title: item.data.front_text || item.data.title || "Untitled",
    module: item.type === "flashcard" ? "flashcards" : "quizzes",
    rawData: item.data, // Preserve raw data for specialized view rendering
  };

  // Flashcard-specific transformation
  if (item.type === "flashcard") {
    return {
      ...baseItem,
      priority: determinePriority(item.data),
      dueDate: item.data.next_review || null,
      estimatedTime: 2, // 2 minutes per flashcard
      lastReviewed: item.data.last_review || null,
      nextReview: item.data.next_review || null,
      difficulty: item.data.ease_factor
        ? calculateDifficulty(item.data.ease_factor)
        : 3,
      masteryLevel: calculateMasteryLevel(item.data),
      deckId: item.data.deck_id,
      learningState: item.data.learning_state,
    };
  }

  // Quiz-specific transformation
  if (item.type === "quiz") {
    return {
      ...baseItem,
      priority: (item.data.priority || "normal") as StudyPriority,
      dueDate: null,
      estimatedTime:
        item.data.time_limit_minutes || item.data.question_count * 2,
      lastReviewed: null,
      nextReview: null,
      difficulty: mapQuizDifficulty(item.data.difficulty),
      masteryLevel: item.data.last_score || 0,
      questionCount: item.data.question_count,
      lastScore: item.data.last_score,
    };
  }

  return baseItem as StudyItem;
}

/**
 * Determine priority based on flashcard data
 */
function determinePriority(data: any): StudyPriority {
  const now = new Date();
  const nextReview = data.next_review ? new Date(data.next_review) : null;

  // Never reviewed (new)
  if (!nextReview || data.learning_state === "NEW") {
    return "new";
  }

  // Overdue
  if (nextReview < now) {
    const daysOverdue = Math.floor(
      (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysOverdue > 7) return "high";
  }

  return "normal";
}

/**
 * Calculate difficulty from ease factor (1-5 scale)
 */
function calculateDifficulty(easeFactor: number): number {
  // Ease factor: 1.3 (hard) to 3.0 (easy)
  // Convert to difficulty: 5 (hard) to 1 (easy)
  const normalized = (easeFactor - 1.3) / (3.0 - 1.3); // 0 to 1
  return Math.round(5 - normalized * 4); // 5 to 1
}

/**
 * Calculate mastery level percentage (0-100)
 */
function calculateMasteryLevel(data: any): number {
  const timesReviewed = data.times_reviewed || 0;
  const accuracy = data.accuracy || 0;
  const easeFactor = data.ease_factor || 2.5;

  // Simple mastery calculation
  // More reviews + higher accuracy + higher ease = higher mastery
  const reviewBonus = Math.min(timesReviewed * 5, 30); // Max 30 points from reviews
  const accuracyScore = accuracy * 0.5; // 50 points max from accuracy
  const easeScore = ((easeFactor - 1.3) / (3.0 - 1.3)) * 20; // 20 points from ease

  return Math.min(100, Math.round(reviewBonus + accuracyScore + easeScore));
}

/**
 * Map quiz difficulty to numeric scale (1-5)
 */
function mapQuizDifficulty(difficulty: string): number {
  const map: Record<string, number> = {
    easy: 2,
    medium: 3,
    hard: 4,
  };
  return map[difficulty] || 3;
}
