/**
 * Session Scheduler - Utilities for planning and organizing study sessions
 *
 * Provides functions for:
 * - Calculating optimal session duration
 * - Breaking sessions into chunks
 * - Scheduling breaks
 * - Formatting time displays
 */

import type { StudyItem } from "../types/study.types";

/**
 * Calculate recommended session duration based on items
 * Returns duration in minutes
 */
export function calculateSessionDuration(items: StudyItem[]): number {
  let totalTime = 0;

  for (const item of items) {
    if (item.estimatedTime) {
      totalTime += item.estimatedTime;
    } else {
      // Default estimates
      if (item.type === "flashcard") totalTime += 2;
      else if (item.type === "quiz")
        totalTime += item.questionCount ? item.questionCount * 2 : 10;
      else totalTime += 5;
    }
  }

  // Add break time for longer sessions
  if (totalTime > 25) {
    const breaks = Math.floor(totalTime / 25);
    totalTime += breaks * 5; // 5-minute breaks
  }

  return Math.ceil(totalTime);
}

/**
 * Suggest optimal study time based on current time of day
 */
export function suggestOptimalStudyTime(): string {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 9)
    return "Early morning - great for memory retention!";
  if (hour >= 9 && hour < 12)
    return "Late morning - peak cognitive performance!";
  if (hour >= 12 && hour < 14) return "After lunch - take it easy with review";
  if (hour >= 14 && hour < 17) return "Afternoon - good for active learning";
  if (hour >= 17 && hour < 20) return "Evening - consolidate what you learned";
  if (hour >= 20 && hour < 23) return "Night - review only, avoid new material";
  return "Late night - consider studying tomorrow instead";
}

/**
 * Break session into study chunks with breaks
 * Returns array of {type: 'study' | 'break', duration: minutes}
 */
export function createStudyChunks(
  totalMinutes: number,
): Array<{ type: "study" | "break"; duration: number }> {
  const chunks: Array<{ type: "study" | "break"; duration: number }> = [];
  let remaining = totalMinutes;

  while (remaining > 0) {
    if (remaining <= 25) {
      chunks.push({ type: "study", duration: remaining });
      break;
    }

    chunks.push({ type: "study", duration: 25 });
    remaining -= 25;

    if (remaining > 0) {
      const breakDuration =
        chunks.filter((c) => c.type === "study").length % 4 === 0 ? 15 : 5;
      chunks.push({ type: "break", duration: breakDuration });
    }
  }

  return chunks;
}

/**
 * Shuffle items randomly (for practice sessions)
 */
export function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * Interleave items from different modules (better for learning)
 */
export function interleaveByModule(items: StudyItem[]): StudyItem[] {
  const byModule = new Map<string, StudyItem[]>();

  // Group by module
  for (const item of items) {
    const module = item.module || "unknown";
    if (!byModule.has(module)) {
      byModule.set(module, []);
    }
    byModule.get(module)!.push(item);
  }

  // Interleave
  const interleaved: StudyItem[] = [];
  const moduleArrays = Array.from(byModule.values());
  let maxLength = Math.max(...moduleArrays.map((arr) => arr.length));

  for (let i = 0; i < maxLength; i++) {
    for (const moduleItems of moduleArrays) {
      if (i < moduleItems.length) {
        interleaved.push(moduleItems[i]!);
      }
    }
  }

  return interleaved;
}

/**
 * Calculate break time needed for session duration
 * Uses Pomodoro-style: 5 min break every 25 min, 15 min every 2 hours
 */
export function calculateBreakTime(studyMinutes: number): number {
  if (studyMinutes <= 25) return 0;

  const intervals = Math.floor(studyMinutes / 25);
  const longBreaks = Math.floor(intervals / 4);
  const shortBreaks = intervals - longBreaks;

  return shortBreaks * 5 + longBreaks * 15;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format seconds to MM:SS
 */
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Check if item is due for review
 */
export function isTimeForReview(item: StudyItem): boolean {
  if (!item.nextReview) return false;
  return new Date(item.nextReview) <= new Date();
}

/**
 * Calculate next review date using spaced repetition
 * Simple implementation - real one should be in backend
 */
export function calculateNextReview(
  currentInterval: number,
  performance: "again" | "hard" | "good" | "easy",
): Date {
  const now = new Date();
  const multipliers = {
    again: 0.5, // Review sooner
    hard: 1.2, // Slight increase
    good: 2.5, // Normal increase
    easy: 4.0, // Large increase
  };

  const multiplier = multipliers[performance];
  const nextInterval = Math.max(1, Math.round(currentInterval * multiplier));
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + nextInterval);

  return nextReview;
}
