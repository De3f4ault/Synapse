/**
 * ListeningModel Types - Recommendation & Bias Definitions
 *
 * Pure type definitions for the intelligence layer.
 * No imports from core/, policy/, or clients/.
 */

import type { AudioContext } from '../context/contextProfiles';

// ===========================================================================
// BIAS TYPES
// ===========================================================================

/**
 * Bias level for a capability.
 * - prefer: User typically wants this
 * - neutral: No strong signal either way
 * - avoid: User typically does not want this
 */
export type Bias = 'prefer' | 'neutral' | 'avoid';

/**
 * Confidence level (0-1).
 * - 0: No data / no confidence
 * - 0.5: Some signal, not strong
 * - 1: Strong, consistent signal
 */
export type Confidence = number;

// ===========================================================================
// RECOMMENDATION TYPES
// ===========================================================================

/**
 * Recommendation for a specific capability in a context.
 */
export interface CapabilityRecommendation {
  bias: Bias;
  confidence: Confidence;
  /** When this recommendation expires (timestamp) */
  expiresAt: number;
  /** Source signals that led to this recommendation */
  sources: string[];
}

/**
 * Full recommendation for a context.
 * Advisory only — clients may ignore.
 */
export interface AudioRecommendation {
  context: AudioContext;
  music: CapabilityRecommendation;
  tts: CapabilityRecommendation;
  notifications: CapabilityRecommendation;
  /** Overall confidence in this recommendation set */
  overallConfidence: Confidence;
  /** When this recommendation was generated */
  generatedAt: number;
}

// ===========================================================================
// SIGNAL TYPES (Input to Heuristics)
// ===========================================================================

/**
 * Signals extracted from user behavior.
 * These are aggregated from listening history.
 */
export interface BehaviorSignals {
  /** Number of manual stops within first 30 seconds */
  earlyStops: number;
  /** Number of sessions > 5 minutes */
  longSessions: number;
  /** Number of times user resumed after auto-pause */
  manualResumes: number;
  /** Number of times user manually started music */
  manualStarts: number;
  /** Average session duration in seconds */
  avgSessionDuration: number;
  /** Number of skips */
  skips: number;
  /** Total sessions analyzed */
  totalSessions: number;
}

/**
 * Signals for a specific context.
 */
export interface ContextSignals {
  context: AudioContext;
  music: BehaviorSignals;
  tts: BehaviorSignals;
  notifications: BehaviorSignals;
  /** Last time signals were updated */
  updatedAt: number;
}

// ===========================================================================
// PERSISTENCE TYPES
// ===========================================================================

/**
 * Persisted preference scores per context.
 * Time-decayed aggregates, not raw decisions.
 */
export interface PersistedPreferences {
  context: AudioContext;
  /** Score -1 to 1 (negative = avoid, positive = prefer) */
  musicScore: number;
  ttsScore: number;
  notificationScore: number;
  /** Number of data points contributing to scores */
  sampleCount: number;
  /** Last update timestamp */
  updatedAt: number;
}

// ===========================================================================
// CONSTANTS
// ===========================================================================

/** Recommendation expiry time (24 hours) */
export const RECOMMENDATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Minimum confidence to act on recommendation */
export const MIN_ACTIONABLE_CONFIDENCE = 0.3;

/** Time decay factor per day (multiply score by this each day) */
export const DAILY_DECAY_FACTOR = 0.9;

/** Minimum sessions needed for confident recommendation */
export const MIN_SESSIONS_FOR_CONFIDENCE = 3;
