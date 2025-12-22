/**
 * Priority calculation weights for queue items
 *
 * Priority = (due_urgency × 0.4) + (weak_area × 0.3) + (dependency × 0.2) + (recency × 0.1)
 */
export const PRIORITY_WEIGHTS = {
  dueUrgency: 0.4, // How soon is it due?
  weakArea: 0.3, // Is it a weak area?
  dependency: 0.2, // Does it unlock other content?
  recency: 0.1, // When was it last accessed?
} as const;

/**
 * Priority thresholds for classification
 */
export const PRIORITY_THRESHOLDS = {
  urgent: 0.8, // >= 0.8 = urgent
  high: 0.6, // >= 0.6 = high
  medium: 0.4, // >= 0.4 = medium
  // < 0.4 = low
} as const;

/**
 * Weak area severity thresholds
 */
export const WEAK_AREA_THRESHOLDS = {
  high: 0.5, // < 50% accuracy
  medium: 0.7, // < 70% accuracy
  // >= 70% = low severity
} as const;

/**
 * Mastery thresholds
 */
export const MASTERY_THRESHOLDS = {
  mastered: 0.85, // >= 85% accuracy + high ease factor
  proficient: 0.75, // >= 75% accuracy
  learning: 0.6, // >= 60% accuracy
  // < 60% = struggling
} as const;

/**
 * Session detection parameters
 */
export const SESSION_CONFIG = {
  timeoutMinutes: 30, // Actions within 30min = same session
  minActions: 3, // Minimum actions to count as a session
} as const;
