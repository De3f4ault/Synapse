/**
 * Graph Module - Learning Constants
 *
 * Configurable thresholds for learning intelligence.
 * These control when mastery/weakness edges are created and decayed.
 *
 * DO NOT HARDCODE THRESHOLDS - use these constants.
 */

// ============================================================================
// Mastery Thresholds
// ============================================================================

/**
 * Minimum accuracy percentage to create a mastery edge.
 * Range: 0-100
 */
export const MASTERY_ACCURACY_THRESHOLD = 80;

/**
 * Minimum number of attempts/reviews before mastery can be granted.
 */
export const MASTERY_MIN_ATTEMPTS = 3;

/**
 * Maximum age (in days) of attempts to consider for mastery.
 * Older attempts don't count toward the threshold.
 */
export const MASTERY_RECENCY_DAYS = 30;

// ============================================================================
// Weakness Thresholds
// ============================================================================

/**
 * Accuracy percentage below which a weakness edge is created.
 * Range: 0-100
 */
export const WEAKNESS_ACCURACY_THRESHOLD = 50;

/**
 * Weight assigned to weakness edge on creation.
 * Higher = more significant weakness.
 */
export const WEAKNESS_INITIAL_WEIGHT = 1.0;

/**
 * Weight increase per consecutive wrong answer.
 */
export const WEAKNESS_WEIGHT_INCREMENT = 0.2;

/**
 * Maximum weakness weight.
 */
export const WEAKNESS_WEIGHT_MAX = 2.0;

// ============================================================================
// Edge Decay
// ============================================================================

/**
 * Daily decay rate for weakness edges.
 * Applied passively over time to fade old weaknesses.
 * Range: 0-1 (0 = no decay, 1 = full decay per day)
 */
export const WEAKNESS_DAILY_DECAY_RATE = 0.05;

/**
 * Weight reduction when user gets a previously weak concept correct.
 */
export const WEAKNESS_IMPROVEMENT_REDUCTION = 0.3;

/**
 * Threshold below which a weakness edge is removed entirely.
 */
export const WEAKNESS_REMOVAL_THRESHOLD = 0.1;

// ============================================================================
// Practice Edges
// ============================================================================

/**
 * Base weight for a practice edge.
 */
export const PRACTICE_BASE_WEIGHT = 1.0;

/**
 * Weight multiplier based on accuracy (1.0 = 100% accuracy).
 */
export const PRACTICE_ACCURACY_MULTIPLIER = 1.5;

// ============================================================================
// User Node
// ============================================================================

/**
 * Special node ID for the current user.
 * Used as the source for mastery/weakness edges.
 */
export const CURRENT_USER_NODE_ID = "user:current";

/**
 * Entity type for user nodes in the graph.
 */
export const USER_ENTITY_TYPE = "user";
