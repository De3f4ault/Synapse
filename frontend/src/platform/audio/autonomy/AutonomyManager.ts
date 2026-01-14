/**
 * AutonomyManager - Decision Gate
 *
 * Decides whether recommendations should be applied automatically.
 * This is the consent gate between intelligence and behavior.
 *
 * ## Design Principles
 * - Pure queries, no side effects
 * - Consent-first: no action without permission
 * - Explainable: every decision has a reason
 *
 * ## What It Does
 * - Reads consent from consentStore
 * - Reads recommendations from ListeningModel
 * - Produces decisions (shouldAutoApply, shouldSuggest)
 *
 * ## What It Does NOT Do
 * - Execute playback
 * - Modify engine state
 * - Change consent (that's consentStore's job)
 */

import { consentStore } from './consentStore';
import type {
  AutonomyQuery,
  AutonomyDecision,
  AutonomyLevel,
  AutonomyCapability,
  AutonomyReason,
} from './types';
import { MIN_AUTONOMY_CONFIDENCE } from './types';
import type { AudioContext } from '../context/contextProfiles';

type AutonomyChangeCallback = (context: AudioContext, capability: AutonomyCapability) => void;

class AutonomyManagerClass {
  private listeners: Set<AutonomyChangeCallback> = new Set();

  constructor() {
    console.debug('[AutonomyManager] Initialized (consent gate)');
  }

  // ===========================================================================
  // PUBLIC API (Pure Queries)
  // ===========================================================================

  /**
   * Main decision function: should we auto-apply this capability?
   * Returns a full decision object with reasoning.
   */
  decide(query: AutonomyQuery): AutonomyDecision {
    const { context, capability, recommendedBias, confidence = 0 } = query;

    // Check global kill switch
    if (!consentStore.isGlobalEnabled()) {
      return this.makeDecision(false, false, 'global_disabled', 'off');
    }

    // Get consent level
    const consentLevel = consentStore.getLevel(context, capability);

    // If consent is off, no autonomy
    if (consentLevel === 'off') {
      return this.makeDecision(false, false, 'consent_off', consentLevel);
    }

    // If recommendation says avoid and we trust it, don't auto-apply
    if (recommendedBias === 'avoid' && confidence >= MIN_AUTONOMY_CONFIDENCE) {
      return this.makeDecision(false, false, 'recommendation_avoid', consentLevel);
    }

    // If confidence is too low, treat as suggest-only
    if (confidence < MIN_AUTONOMY_CONFIDENCE && consentLevel === 'auto') {
      return this.makeDecision(false, true, 'low_confidence', consentLevel);
    }

    // Consent-based decision
    if (consentLevel === 'suggest') {
      return this.makeDecision(false, true, 'consent_suggest', consentLevel);
    }

    if (consentLevel === 'auto') {
      return this.makeDecision(true, true, 'consent_auto', consentLevel);
    }

    // Fallback (should never reach)
    return this.makeDecision(false, false, 'no_consent', consentLevel);
  }

  /**
   * Simplified check: should this capability auto-apply?
   */
  shouldAutoApply(context: AudioContext, capability: AutonomyCapability): boolean {
    const decision = this.decide({ context, capability });
    return decision.shouldAutoApply;
  }

  /**
   * Simplified check: should this capability be suggested?
   */
  shouldSuggest(context: AudioContext, capability: AutonomyCapability): boolean {
    const decision = this.decide({ context, capability });
    return decision.shouldSuggest;
  }

  /**
   * Get current autonomy level for a context + capability.
   */
  getLevel(context: AudioContext, capability: AutonomyCapability): AutonomyLevel {
    return consentStore.getLevel(context, capability);
  }

  /**
   * Set autonomy level (delegates to consentStore).
   */
  setLevel(context: AudioContext, capability: AutonomyCapability, level: AutonomyLevel): void {
    consentStore.setLevel(context, capability, level);
    this.notifyListeners(context, capability);
  }

  /**
   * Check if global autonomy is enabled.
   */
  isGlobalEnabled(): boolean {
    return consentStore.isGlobalEnabled();
  }

  /**
   * Enable/disable global autonomy.
   */
  setGlobalEnabled(enabled: boolean): void {
    consentStore.setGlobalEnabled(enabled);
    // Notify all listeners (context=idle triggers global)
    this.notifyListeners('idle', 'music');
  }

  /**
   * Subscribe to autonomy changes.
   */
  subscribe(callback: AutonomyChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private makeDecision(
    shouldAutoApply: boolean,
    shouldSuggest: boolean,
    reason: AutonomyReason,
    consentLevel: AutonomyLevel
  ): AutonomyDecision {
    return {
      shouldAutoApply,
      shouldSuggest,
      reason,
      consentLevel,
    };
  }

  private notifyListeners(context: AudioContext, capability: AutonomyCapability): void {
    for (const callback of this.listeners) {
      try {
        callback(context, capability);
      } catch (err) {
        console.error('[AutonomyManager] Listener error:', err);
      }
    }
  }
}

// Singleton export
export const autonomyManager = new AutonomyManagerClass();
