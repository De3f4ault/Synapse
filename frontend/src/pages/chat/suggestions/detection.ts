/**
 * Detection Strategies — Pattern Recognition for Suggestions
 *
 * Two core detection strategies:
 * 1. Semantic Drift → Suggest Thread (embeddings-based)
 * 2. Counterfactual Language → Suggest Branch (regex-based)
 *
 * INVARIANT: Detection is stateless and side-effect free.
 * INVARIANT: Detection produces signals, not actions.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Semantic drift thresholds (cosine distance)
 * - 0.25–0.35: mild drift (optional suggestion)
 * - > 0.40: strong drift (recommend thread)
 */
export const DRIFT_THRESHOLD_MILD = 0.25;
export const DRIFT_THRESHOLD_STRONG = 0.40;

/**
 * Counterfactual language patterns.
 * Explicit, auditable, and easily extensible.
 */
export const COUNTERFACTUAL_PATTERNS: RegExp[] = [
    /what if/i,
    /alternatively/i,
    /another approach/i,
    /let'?s try/i,
    /can you do it differently/i,
    /instead of that/i,
    /try another/i,
    /different way/i,
    /other option/i,
    /how about instead/i,
    /could you try/i,
    /give me another/i,
    /other perspective/i,
    /rethink/i,
    /reconsider/i,
];

// ============================================================================
// Semantic Drift Detection
// ============================================================================

/**
 * Compute cosine distance between two embedding vectors.
 *
 * Returns a value between 0 (identical) and 2 (opposite).
 * For normalized vectors, values typically range 0–1.
 */
export function cosineDistance(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i]! * b[i]!;
        normA += a[i]! * a[i]!;
        normB += b[i]! * b[i]!;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    const similarity = dotProduct / denominator;
    // Convert similarity (1 = same, -1 = opposite) to distance (0 = same, 2 = opposite)
    return 1 - similarity;
}

/**
 * Detect semantic drift between two embeddings.
 *
 * @param rootEmbedding - Embedding of the thread/conversation root
 * @param newEmbedding - Embedding of the latest message
 * @returns Drift score (0 = no drift, higher = more drift)
 */
export function detectSemanticDrift(
    rootEmbedding: number[],
    newEmbedding: number[],
): number {
    return cosineDistance(rootEmbedding, newEmbedding);
}

/**
 * Check if drift level indicates topic divergence.
 *
 * @param driftScore - Result from detectSemanticDrift
 * @param threshold - Threshold to consider as significant drift
 */
export function isDriftSignificant(
    driftScore: number,
    threshold: number = DRIFT_THRESHOLD_STRONG,
): boolean {
    return driftScore > threshold;
}

// ============================================================================
// Counterfactual Language Detection
// ============================================================================

/**
 * Detect counterfactual language in text.
 *
 * Counterfactual language indicates the user wants to explore
 * an alternative reasoning path, not a new topic.
 *
 * Examples:
 * - "What if we tried a different approach?"
 * - "Can you do it differently?"
 * - "Let's try another way"
 *
 * @param text - Text to analyze
 * @returns true if counterfactual language detected
 */
export function detectCounterfactual(text: string): boolean {
    return COUNTERFACTUAL_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Get the specific counterfactual pattern that matched.
 * Useful for debugging and logging.
 */
export function getCounterfactualMatch(text: string): RegExp | null {
    return COUNTERFACTUAL_PATTERNS.find((pattern) => pattern.test(text)) ?? null;
}

/**
 * Calculate confidence based on counterfactual match strength.
 *
 * Currently returns a fixed confidence, but could be enhanced
 * to weight different patterns differently.
 */
export function getCounterfactualConfidence(text: string): number {
    const match = getCounterfactualMatch(text);
    if (!match) return 0;

    // Strong indicators get higher confidence
    const strongIndicators = [/what if/i, /alternatively/i, /different way/i];
    if (strongIndicators.some((p) => p.test(text))) {
        return 0.75;
    }

    return 0.6;
}
