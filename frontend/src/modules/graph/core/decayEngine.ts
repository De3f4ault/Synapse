/**
 * Graph Module - Decay Engine
 *
 * CORE INSIGHT:
 * Spaced repetition is edge-weight evolution, not scheduling.
 * Memory is implicit in edge strength over time.
 *
 * ARCHITECTURE:
 * - Pure, deterministic functions
 * - No external state
 * - Time-based decay with stability factor
 * - Edge-type-specific behavior
 *
 * INSPIRED BY:
 * - SuperMemo SM-17 (stability model)
 * - Anki (ease factor concept)
 * - FSRS (forgetting stability rating)
 */

import { GraphEdgeType } from "./graphStore";
import type { RelationType } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata for learning edges (MASTERY, WEAKNESS, PRACTICED).
 * Stored in edge.metadata.
 */
export interface LearningEdgeMetadata {
    /** Current memory strength (0-1). Decays over time. */
    strength: number;

    /** Last time this edge was reinforced (ms timestamp) */
    lastReviewedAt: number;

    /**
     * Stability factor. Higher = slower decay.
     * Grows with successful reviews, shrinks with failures.
     * Range: 0.5 - 10.0
     */
    stability: number;

    /** Number of successful reinforcements */
    successCount: number;

    /** Number of failed reinforcements */
    failCount: number;
}

/**
 * Decay result after applying time-based decay.
 */
export interface DecayResult {
    /** New strength after decay */
    strength: number;

    /** Is this item due for review? */
    isDue: boolean;

    /** Is this item overdue (forgotten)? */
    isOverdue: boolean;

    /** Days until strength reaches threshold (0 if already due) */
    daysUntilDue: number;

    /** Retrievability estimate (0-1) */
    retrievability: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Decay constants (tunable, research-backed defaults).
 */
export const DECAY_CONSTANTS = {
    /** Strength threshold below which item is "due" */
    DUE_THRESHOLD: 0.9,

    /** Strength threshold below which item is "overdue" (forgotten) */
    OVERDUE_THRESHOLD: 0.7,

    /** Base decay rate (per day) for WEAKNESS edges */
    WEAKNESS_DECAY_RATE: 0.15,

    /** Base decay rate (per day) for MASTERY edges */
    MASTERY_DECAY_RATE: 0.05,

    /** Base decay rate (per day) for PRACTICED edges */
    PRACTICED_DECAY_RATE: 0.10,

    /** Minimum stability factor */
    MIN_STABILITY: 0.5,

    /** Maximum stability factor */
    MAX_STABILITY: 10.0,

    /** Stability increase on successful review */
    STABILITY_SUCCESS_BOOST: 1.3,

    /** Stability decrease on failed review */
    STABILITY_FAILURE_PENALTY: 0.8,

    /** Initial stability for new edges */
    INITIAL_STABILITY: 1.0,

    /** Initial strength for new edges */
    INITIAL_STRENGTH: 1.0,

    /** Milliseconds in a day */
    MS_PER_DAY: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// Core Decay Function
// ============================================================================

/**
 * Calculate decayed strength using exponential decay with stability.
 *
 * Formula: strength(t) = strength₀ × e^(-t / (stability × baseHalfLife))
 *
 * @param initialStrength - Strength at last review (0-1)
 * @param stability - Stability factor (higher = slower decay)
 * @param elapsedDays - Days since last review
 * @param baseDecayRate - Base decay rate per day
 * @returns New strength after decay (0-1)
 */
export function calculateDecay(
    initialStrength: number,
    stability: number,
    elapsedDays: number,
    baseDecayRate: number
): number {
    // Clamp inputs
    initialStrength = Math.max(0, Math.min(1, initialStrength));
    stability = Math.max(DECAY_CONSTANTS.MIN_STABILITY, Math.min(DECAY_CONSTANTS.MAX_STABILITY, stability));
    elapsedDays = Math.max(0, elapsedDays);

    // Exponential decay: S(t) = S₀ × e^(-λt/s)
    // where λ is decay rate, s is stability
    const effectiveDecayRate = baseDecayRate / stability;
    const decayedStrength = initialStrength * Math.exp(-effectiveDecayRate * elapsedDays);

    return Math.max(0, Math.min(1, decayedStrength));
}

/**
 * Get the base decay rate for an edge type.
 */
export function getDecayRateForEdgeType(edgeType: RelationType | string): number {
    switch (edgeType) {
        case GraphEdgeType.WEAKNESS:
        case "weakness":
            return DECAY_CONSTANTS.WEAKNESS_DECAY_RATE;

        case GraphEdgeType.MASTERY:
        case "mastery":
            return DECAY_CONSTANTS.MASTERY_DECAY_RATE;

        case GraphEdgeType.PRACTICED:
        case "practiced":
            return DECAY_CONSTANTS.PRACTICED_DECAY_RATE;

        default:
            // Non-learning edges don't decay
            return 0;
    }
}

/**
 * Check if an edge type is a learning edge (subject to decay).
 */
export function isLearningEdge(edgeType: RelationType | string): boolean {
    return (
        edgeType === (GraphEdgeType.WEAKNESS as string) ||
        edgeType === (GraphEdgeType.MASTERY as string) ||
        edgeType === (GraphEdgeType.PRACTICED as string)
    );
}

// ============================================================================
// Edge Metadata Operations
// ============================================================================

/**
 * Create initial learning metadata for a new edge.
 */
export function createLearningMetadata(now: number = Date.now()): LearningEdgeMetadata {
    return {
        strength: DECAY_CONSTANTS.INITIAL_STRENGTH,
        lastReviewedAt: now,
        stability: DECAY_CONSTANTS.INITIAL_STABILITY,
        successCount: 0,
        failCount: 0,
    };
}

/**
 * Extract learning metadata from edge metadata (with defaults).
 */
export function extractLearningMetadata(
    metadata: Record<string, unknown>
): LearningEdgeMetadata {
    return {
        strength: (metadata.strength as number) ?? DECAY_CONSTANTS.INITIAL_STRENGTH,
        lastReviewedAt: (metadata.lastReviewedAt as number) ?? Date.now(),
        stability: (metadata.stability as number) ?? DECAY_CONSTANTS.INITIAL_STABILITY,
        successCount: (metadata.successCount as number) ?? 0,
        failCount: (metadata.failCount as number) ?? 0,
    };
}

// ============================================================================
// Decay Application
// ============================================================================

/**
 * Apply decay to an edge and get current state.
 *
 * @param metadata - Edge learning metadata
 * @param edgeType - Type of edge
 * @param now - Current timestamp (ms)
 * @returns Decay result with current strength and due status
 */
export function applyDecay(
    metadata: LearningEdgeMetadata,
    edgeType: RelationType | string,
    now: number = Date.now()
): DecayResult {
    const elapsedMs = now - metadata.lastReviewedAt;
    const elapsedDays = elapsedMs / DECAY_CONSTANTS.MS_PER_DAY;

    const baseDecayRate = getDecayRateForEdgeType(edgeType);

    // If not a learning edge, no decay
    if (baseDecayRate === 0) {
        return {
            strength: metadata.strength,
            isDue: false,
            isOverdue: false,
            daysUntilDue: Infinity,
            retrievability: 1,
        };
    }

    const decayedStrength = calculateDecay(
        metadata.strength,
        metadata.stability,
        elapsedDays,
        baseDecayRate
    );

    const isDue = decayedStrength < DECAY_CONSTANTS.DUE_THRESHOLD;
    const isOverdue = decayedStrength < DECAY_CONSTANTS.OVERDUE_THRESHOLD;

    // Calculate days until due
    let daysUntilDue = 0;
    if (!isDue) {
        // Solve for t: threshold = strength × e^(-λt/s)
        // t = -s/λ × ln(threshold / strength)
        const effectiveDecayRate = baseDecayRate / metadata.stability;
        daysUntilDue = Math.max(
            0,
            (-1 / effectiveDecayRate) *
            Math.log(DECAY_CONSTANTS.DUE_THRESHOLD / metadata.strength) -
            elapsedDays
        );
    }

    return {
        strength: decayedStrength,
        isDue,
        isOverdue,
        daysUntilDue: Math.max(0, daysUntilDue),
        retrievability: decayedStrength,
    };
}

// ============================================================================
// Reinforcement (After Review)
// ============================================================================

/**
 * Update metadata after a successful review.
 * Resets strength to 1 and increases stability.
 */
export function reinforceSuccess(
    metadata: LearningEdgeMetadata,
    now: number = Date.now()
): LearningEdgeMetadata {
    const newStability = Math.min(
        DECAY_CONSTANTS.MAX_STABILITY,
        metadata.stability * DECAY_CONSTANTS.STABILITY_SUCCESS_BOOST
    );

    return {
        strength: DECAY_CONSTANTS.INITIAL_STRENGTH,
        lastReviewedAt: now,
        stability: newStability,
        successCount: metadata.successCount + 1,
        failCount: metadata.failCount,
    };
}

/**
 * Update metadata after a failed review.
 * Partially resets strength and decreases stability.
 */
export function reinforceFailure(
    metadata: LearningEdgeMetadata,
    now: number = Date.now()
): LearningEdgeMetadata {
    const newStability = Math.max(
        DECAY_CONSTANTS.MIN_STABILITY,
        metadata.stability * DECAY_CONSTANTS.STABILITY_FAILURE_PENALTY
    );

    return {
        strength: 0.6, // Partial reset, not full
        lastReviewedAt: now,
        stability: newStability,
        successCount: metadata.successCount,
        failCount: metadata.failCount + 1,
    };
}

// ============================================================================
// Scheduling Helpers
// ============================================================================

/**
 * Calculate optimal review interval based on stability.
 * Returns days until next review for target retrievability.
 *
 * @param stability - Current stability factor
 * @param targetRetrievability - Target strength at review time (default: 0.9)
 * @param edgeType - Type of learning edge
 */
export function calculateOptimalInterval(
    stability: number,
    targetRetrievability: number = DECAY_CONSTANTS.DUE_THRESHOLD,
    edgeType: RelationType | string = GraphEdgeType.PRACTICED
): number {
    const baseDecayRate = getDecayRateForEdgeType(edgeType);
    if (baseDecayRate === 0) return Infinity;

    // Solve: target = 1 × e^(-λt/s)
    // t = -s/λ × ln(target)
    const effectiveDecayRate = baseDecayRate / stability;
    const interval = (-1 / effectiveDecayRate) * Math.log(targetRetrievability);

    return Math.max(0.5, interval); // Minimum 12 hours
}

/**
 * Get priority score for review scheduling.
 * Higher score = more urgent review.
 *
 * @param decayResult - Result from applyDecay
 * @returns Priority score (0-100)
 */
export function calculateReviewPriority(decayResult: DecayResult): number {
    if (decayResult.isOverdue) {
        // Very high priority for forgotten items
        return 100 - decayResult.strength * 30;
    }

    if (decayResult.isDue) {
        // High priority for due items
        return 70 - decayResult.strength * 20;
    }

    // Lower priority based on days until due
    const daysAway = Math.min(decayResult.daysUntilDue, 30);
    return Math.max(0, 30 - daysAway);
}

// ============================================================================
// Forgetting Curve Data (For Visualization)
// ============================================================================

/**
 * Generate forgetting curve data points.
 * Useful for visualizing decay over time.
 *
 * @param metadata - Edge learning metadata
 * @param edgeType - Type of edge
 * @param daysAhead - How many days to project
 * @param pointCount - Number of data points
 */
export function generateForgettingCurve(
    metadata: LearningEdgeMetadata,
    edgeType: RelationType | string,
    daysAhead: number = 30,
    pointCount: number = 30
): Array<{ day: number; strength: number }> {
    const baseDecayRate = getDecayRateForEdgeType(edgeType);
    const points: Array<{ day: number; strength: number }> = [];

    for (let i = 0; i <= pointCount; i++) {
        const day = (i / pointCount) * daysAhead;
        const strength = calculateDecay(
            metadata.strength,
            metadata.stability,
            day,
            baseDecayRate
        );
        points.push({ day, strength });
    }

    return points;
}
