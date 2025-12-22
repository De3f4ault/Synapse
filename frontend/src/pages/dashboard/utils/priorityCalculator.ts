import {
  PRIORITY_WEIGHTS,
  PRIORITY_THRESHOLDS,
} from "../constants/priorityWeights";
import type { PriorityLevel } from "../types/dashboard.types";

/**
 * Priority Calculator
 * FIXED: Uses correct number-based priority (0-1) and proper typing
 */

/**
 * Input parameters for priority calculation
 */
export interface PriorityInput {
  dueDate?: string | null;
  isWeakArea?: boolean;
  accuracy?: number;
  hasPrerequisites?: boolean;
  lastAccessed?: string | null;
}

/**
 * Calculate priority score for a queue item (0-1)
 *
 * @param input - Priority calculation parameters
 * @returns Priority score between 0 and 1
 */
export function calculatePriority(input: PriorityInput): number {
  const {
    dueDate,
    isWeakArea = false,
    accuracy = 1,
    hasPrerequisites = false,
    lastAccessed,
  } = input;

  // 1. Due urgency score (0-1)
  const dueScore = calculateDueScore(dueDate);

  // 2. Weak area score (0-1)
  const weakScore = isWeakArea ? 1 - accuracy : 0;

  // 3. Dependency score (has prerequisites or unlocks content)
  const depScore = hasPrerequisites ? 0.8 : 0;

  // 4. Recency score (recently accessed = lower priority)
  const recencyScore = calculateRecencyScore(lastAccessed);

  // Weighted sum
  const totalScore =
    PRIORITY_WEIGHTS.dueUrgency * dueScore +
    PRIORITY_WEIGHTS.weakArea * weakScore +
    PRIORITY_WEIGHTS.dependency * depScore +
    PRIORITY_WEIGHTS.recency * recencyScore;

  return Math.max(0, Math.min(1, totalScore));
}

/**
 * Convert priority score to priority level
 *
 * @param score - Priority score (0-1)
 * @returns Priority level enum
 */
export function scoreToPriorityLevel(score: number): PriorityLevel {
  if (score >= PRIORITY_THRESHOLDS.urgent) return "urgent";
  if (score >= PRIORITY_THRESHOLDS.high) return "high";
  if (score >= PRIORITY_THRESHOLDS.medium) return "medium";
  return "low";
}

/**
 * Calculate due score based on due date
 * - Overdue = 1.0
 * - Due today = 0.9
 * - Due in 1-3 days = 0.7-0.8
 * - Due in 4-7 days = 0.4-0.6
 * - Due > 1 week = 0-0.3
 */
function calculateDueScore(dueDate?: string | null): number {
  if (!dueDate) return 0;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 1.0; // Overdue
  if (diffDays < 1) return 0.9; // Due today
  if (diffDays < 3) return 0.8 - (diffDays - 1) * 0.05; // Due in 1-3 days
  if (diffDays < 7) return 0.6 - (diffDays - 3) * 0.05; // Due in 4-7 days
  return Math.max(0, 0.3 - (diffDays - 7) * 0.01); // Due > 1 week
}

/**
 * Calculate recency score
 * - Never accessed = 1.0
 * - Accessed > 30 days ago = 0.8-1.0
 * - Accessed 7-30 days ago = 0.5-0.8
 * - Accessed < 7 days ago = 0-0.5
 */
function calculateRecencyScore(lastAccessed?: string | null): number {
  if (!lastAccessed) return 1.0; // Never accessed

  const now = new Date();
  const last = new Date(lastAccessed);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > 30) return 1.0;
  if (diffDays > 7) return 0.5 + ((diffDays - 7) / 23) * 0.3;
  return Math.min(1, (diffDays / 7) * 0.5);
}
