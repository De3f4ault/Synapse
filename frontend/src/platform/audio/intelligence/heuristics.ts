/**
 * Heuristics - Deterministic Intent Inference Rules
 *
 * Pure functions that interpret behavior signals into recommendations.
 * No side effects. No subscriptions. No engine access.
 *
 * ## Design Principles
 * - Stateless: Same input → same output
 * - Testable: Each heuristic can be unit tested
 * - Transparent: Logic is explicit, not hidden
 */

import type {
  Bias,
  Confidence,
  BehaviorSignals,
  CapabilityRecommendation,
} from './types';

// ===========================================================================
// CORE HEURISTIC FUNCTIONS
// ===========================================================================

/**
 * Infer bias from behavior signals.
 * Returns bias and confidence.
 */
export function inferBias(signals: BehaviorSignals): { bias: Bias; confidence: Confidence } {
  const { earlyStops, longSessions, manualResumes, manualStarts, skips, totalSessions } = signals;

  // Not enough data
  if (totalSessions < 3) {
    return { bias: 'neutral', confidence: 0 };
  }

  // Calculate positive and negative signals
  const positiveSignals = longSessions + manualResumes + manualStarts;
  const negativeSignals = earlyStops + skips;

  const positiveRatio = positiveSignals / totalSessions;
  const negativeRatio = negativeSignals / totalSessions;

  // Determine bias
  let bias: Bias = 'neutral';
  
  if (positiveRatio > 0.6 && negativeRatio < 0.2) {
    bias = 'prefer';
  } else if (negativeRatio > 0.5 || (earlyStops / totalSessions > 0.4)) {
    bias = 'avoid';
  }

  // Calculate confidence based on sample size and signal strength
  const signalStrength = Math.abs(positiveRatio - negativeRatio);
  const sampleConfidence = Math.min(1, totalSessions / 10);
  const confidence = signalStrength * sampleConfidence;

  return { bias, confidence };
}

/**
 * Build a capability recommendation from signals.
 */
export function buildRecommendation(
  signals: BehaviorSignals,
  sources: string[] = []
): CapabilityRecommendation {
  const { bias, confidence } = inferBias(signals);

  return {
    bias,
    confidence,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    sources,
  };
}

// ===========================================================================
// SPECIFIC HEURISTICS
// ===========================================================================

/**
 * Music aversion heuristic for study context.
 * Triggers if user frequently stops music early during study.
 */
export function musicAversionInStudy(signals: BehaviorSignals): Bias {
  if (signals.totalSessions < 3) return 'neutral';
  
  const earlyStopRatio = signals.earlyStops / signals.totalSessions;
  
  if (earlyStopRatio > 0.5) {
    return 'avoid';
  }
  
  if (signals.longSessions / signals.totalSessions > 0.7) {
    return 'prefer';
  }
  
  return 'neutral';
}

/**
 * TTS preference heuristic for chat context.
 * Prefer TTS if user frequently enables it and doesn't interrupt.
 */
export function ttsPreferenceInChat(signals: BehaviorSignals): Bias {
  if (signals.totalSessions < 3) return 'neutral';
  
  const manualStartRatio = signals.manualStarts / signals.totalSessions;
  const skipRatio = signals.skips / signals.totalSessions;
  
  if (manualStartRatio > 0.6 && skipRatio < 0.2) {
    return 'prefer';
  }
  
  if (skipRatio > 0.5) {
    return 'avoid';
  }
  
  return 'neutral';
}

/**
 * Notification sensitivity heuristic.
 * Avoid if user frequently dismisses notifications quickly.
 */
export function notificationSensitivity(signals: BehaviorSignals): Bias {
  if (signals.totalSessions < 3) return 'neutral';
  
  // Early stops in notification context = dismissed quickly
  const quickDismissRatio = signals.earlyStops / signals.totalSessions;
  
  if (quickDismissRatio > 0.7) {
    return 'avoid';
  }
  
  return 'neutral';
}

// ===========================================================================
// SCORE CONVERSION
// ===========================================================================

/**
 * Convert persisted score (-1 to 1) to bias.
 */
export function scoreToBias(score: number): Bias {
  if (score > 0.3) return 'prefer';
  if (score < -0.3) return 'avoid';
  return 'neutral';
}

/**
 * Convert bias to score delta for aggregation.
 */
export function biasToScoreDelta(bias: Bias): number {
  switch (bias) {
    case 'prefer': return 0.2;
    case 'avoid': return -0.2;
    case 'neutral': return 0;
  }
}

/**
 * Apply time decay to a score.
 * Decays toward zero over time.
 */
export function applyTimeDecay(score: number, daysSinceUpdate: number): number {
  const decayFactor = Math.pow(0.9, daysSinceUpdate);
  return score * decayFactor;
}

/**
 * Calculate confidence from sample count.
 */
export function sampleCountToConfidence(count: number): Confidence {
  // Confidence grows with samples, asymptoting at 1
  return Math.min(1, count / 10);
}
