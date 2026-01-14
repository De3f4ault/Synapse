/**
 * Autonomy Types - Consent & Control Definitions
 *
 * Pure type definitions for the autonomy layer.
 * No imports from engine, policy, or clients.
 */

import type { AudioContext } from '../context/contextProfiles';

// ===========================================================================
// AUTONOMY LEVELS
// ===========================================================================

/**
 * Level of autonomy granted by user.
 * - off: Never apply recommendations automatically
 * - suggest: Preselect/highlight defaults, but don't execute
 * - auto: Apply defaults automatically (still respects manual override)
 */
export type AutonomyLevel = 'off' | 'suggest' | 'auto';

/**
 * Capabilities that can have autonomy settings.
 */
export type AutonomyCapability = 'music' | 'tts' | 'notifications';

// ===========================================================================
// CONSENT TYPES
// ===========================================================================

/**
 * Consent entry for a specific context + capability.
 */
export interface ConsentEntry {
  context: AudioContext;
  capability: AutonomyCapability;
  level: AutonomyLevel;
  /** When consent was granted/changed */
  grantedAt: number;
  /** User ID (for future multi-user support) */
  userId?: string;
}

/**
 * Full consent state for a user.
 */
export interface ConsentState {
  /** Map of "context:capability" → ConsentEntry */
  entries: Map<string, ConsentEntry>;
  /** Global kill switch */
  globalEnabled: boolean;
  /** Last modified timestamp */
  updatedAt: number;
}

// ===========================================================================
// AUTONOMY DECISION TYPES
// ===========================================================================

/**
 * Query for autonomy decision.
 */
export interface AutonomyQuery {
  context: AudioContext;
  capability: AutonomyCapability;
  /** Recommendation from ListeningModel (if any) */
  recommendedBias?: 'prefer' | 'neutral' | 'avoid';
  /** Confidence of recommendation */
  confidence?: number;
}

/**
 * Result of autonomy decision.
 */
export interface AutonomyDecision {
  /** Should the system auto-apply this capability? */
  shouldAutoApply: boolean;
  /** Should the system suggest this capability? */
  shouldSuggest: boolean;
  /** Why this decision was made */
  reason: AutonomyReason;
  /** The consent level that led to this decision */
  consentLevel: AutonomyLevel;
}

/**
 * Reasons for autonomy decisions.
 */
export type AutonomyReason =
  | 'consent_off'           // User disabled autonomy
  | 'consent_suggest'       // User wants suggestions only
  | 'consent_auto'          // User enabled auto
  | 'global_disabled'       // Global kill switch
  | 'no_consent'            // No consent entry exists (default to off)
  | 'recommendation_avoid'  // ListeningModel says avoid
  | 'low_confidence';       // Recommendation confidence too low

// ===========================================================================
// CONSTANTS
// ===========================================================================

/** Default autonomy level when no consent exists */
export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = 'off';

/** Minimum confidence to act on recommendation */
export const MIN_AUTONOMY_CONFIDENCE = 0.4;

/** Storage key for consent state */
export const CONSENT_STORAGE_KEY = 'synapse-audio-consent';
