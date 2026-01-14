/**
 * ListeningModel - Intent Inference Observer
 *
 * Observes listening history and user behavior to produce recommendations.
 * Advisory only — never executes playback actions.
 *
 * ## Design Principles
 * - OBSERVER: Reads history, emits recommendations
 * - NO CONTROL: Never touches AudioEngine, SoundPolicy, or clients
 * - DETERMINISTIC: Same history → same recommendation
 * - TIME-DECAYED: Old patterns fade, recent patterns dominate
 *
 * ## Data Flow
 * History + Context + Actions → ListeningModel → Recommendations
 *
 * ## Integration
 * - ContextResolver may consume recommendations (optional)
 * - Clients may check bias before defaults (optional)
 */

import type {
  AudioRecommendation,
  CapabilityRecommendation,
  ContextSignals,
  PersistedPreferences,
  Confidence,
} from './types';
import {
  RECOMMENDATION_TTL_MS,
  MIN_ACTIONABLE_CONFIDENCE,
} from './types';
import {
  inferBias,
  buildRecommendation,
  scoreToBias,
  applyTimeDecay,
  sampleCountToConfidence,
} from './heuristics';
import type { AudioContext } from '../context/contextProfiles';

type RecommendationCallback = (recommendation: AudioRecommendation) => void;

class ListeningModelClass {
  private listeners: Set<RecommendationCallback> = new Set();
  private currentRecommendation: AudioRecommendation | null = null;
  private preferences: Map<AudioContext, PersistedPreferences> = new Map();

  constructor() {
    console.debug('[ListeningModel] Initialized (observer-only)');
  }

  // ===========================================================================
  // PUBLIC API (Read-Only)
  // ===========================================================================

  /**
   * Get the current recommendation for a context.
   * Returns null if no confident recommendation exists.
   */
  getRecommendation(context: AudioContext): AudioRecommendation | null {
    if (!this.currentRecommendation) return null;
    if (this.currentRecommendation.context !== context) return null;
    if (Date.now() > this.currentRecommendation.music.expiresAt) return null;
    
    return this.currentRecommendation;
  }

  /**
   * Check if a capability is recommended in current context.
   * Returns true if bias is 'prefer' or 'neutral' with sufficient confidence.
   */
  isRecommended(context: AudioContext, capability: 'music' | 'tts' | 'notifications'): boolean {
    const rec = this.getRecommendation(context);
    if (!rec) return true; // Default to allow if no recommendation
    
    const capRec = rec[capability];
    if (capRec.confidence < MIN_ACTIONABLE_CONFIDENCE) return true; // Low confidence = allow
    
    return capRec.bias !== 'avoid';
  }

  /**
   * Get bias for a capability in a context.
   * Returns 'neutral' if no confident recommendation exists.
   */
  getBias(context: AudioContext, capability: 'music' | 'tts' | 'notifications'): 'prefer' | 'neutral' | 'avoid' {
    const rec = this.getRecommendation(context);
    if (!rec) return 'neutral';
    
    const capRec = rec[capability];
    if (capRec.confidence < MIN_ACTIONABLE_CONFIDENCE) return 'neutral';
    
    return capRec.bias;
  }

  /**
   * Subscribe to recommendation changes.
   */
  subscribe(callback: RecommendationCallback): () => void {
    this.listeners.add(callback);
    
    if (this.currentRecommendation) {
      callback(this.currentRecommendation);
    }
    
    return () => this.listeners.delete(callback);
  }

  // ===========================================================================
  // UPDATE METHODS (Called on session end / context change)
  // ===========================================================================

  /**
   * Update model with new context signals.
   * Called after a session ends, not during playback.
   */
  updateSignals(signals: ContextSignals): void {
    // Build new recommendation from signals
    const recommendation = this.buildRecommendationFromSignals(signals);
    
    // Update current recommendation
    this.currentRecommendation = recommendation;
    
    // Update persisted preferences
    this.updatePreferences(signals);
    
    // Notify listeners
    this.notifyListeners(recommendation);
    
    console.debug('[ListeningModel] Updated for context:', signals.context);
  }

  /**
   * Refresh recommendation for a context using stored preferences.
   * Called on context transition.
   */
  refreshForContext(context: AudioContext): void {
    const prefs = this.preferences.get(context);
    
    if (!prefs) {
      this.currentRecommendation = null;
      return;
    }
    
    // Apply time decay
    const daysSinceUpdate = (Date.now() - prefs.updatedAt) / (24 * 60 * 60 * 1000);
    const decayedMusicScore = applyTimeDecay(prefs.musicScore, daysSinceUpdate);
    const decayedTtsScore = applyTimeDecay(prefs.ttsScore, daysSinceUpdate);
    const decayedNotifScore = applyTimeDecay(prefs.notificationScore, daysSinceUpdate);
    
    // Build recommendation from decayed scores
    const confidence = sampleCountToConfidence(prefs.sampleCount);
    
    this.currentRecommendation = {
      context,
      music: this.scoreToCapabilityRec(decayedMusicScore, confidence),
      tts: this.scoreToCapabilityRec(decayedTtsScore, confidence),
      notifications: this.scoreToCapabilityRec(decayedNotifScore, confidence),
      overallConfidence: confidence,
      generatedAt: Date.now(),
    };
    
    this.notifyListeners(this.currentRecommendation);
  }

  /**
   * Record a user action that overrides model.
   * Immediately adjusts bias toward user preference.
   */
  recordManualOverride(
    context: AudioContext,
    capability: 'music' | 'tts' | 'notifications',
    action: 'enabled' | 'disabled'
  ): void {
    const prefs = this.preferences.get(context) || this.createDefaultPrefs(context);
    
    const scoreKey = `${capability}Score` as 'musicScore' | 'ttsScore' | 'notificationScore';
    const delta = action === 'enabled' ? 0.3 : -0.3;
    
    prefs[scoreKey] = Math.max(-1, Math.min(1, prefs[scoreKey] + delta));
    prefs.sampleCount++;
    prefs.updatedAt = Date.now();
    
    this.preferences.set(context, prefs);
    
    // Refresh recommendation
    this.refreshForContext(context);
    
    console.debug(`[ListeningModel] Manual override: ${capability} ${action} in ${context}`);
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private buildRecommendationFromSignals(signals: ContextSignals): AudioRecommendation {
    return {
      context: signals.context,
      music: buildRecommendation(signals.music, ['session_history']),
      tts: buildRecommendation(signals.tts, ['session_history']),
      notifications: buildRecommendation(signals.notifications, ['session_history']),
      overallConfidence: this.calculateOverallConfidence(signals),
      generatedAt: Date.now(),
    };
  }

  private calculateOverallConfidence(signals: ContextSignals): Confidence {
    const totalSessions = Math.max(
      signals.music.totalSessions,
      signals.tts.totalSessions,
      signals.notifications.totalSessions
    );
    return sampleCountToConfidence(totalSessions);
  }

  private scoreToCapabilityRec(score: number, confidence: Confidence): CapabilityRecommendation {
    return {
      bias: scoreToBias(score),
      confidence,
      expiresAt: Date.now() + RECOMMENDATION_TTL_MS,
      sources: ['stored_preferences'],
    };
  }

  private updatePreferences(signals: ContextSignals): void {
    const prefs = this.preferences.get(signals.context) || this.createDefaultPrefs(signals.context);
    
    // Update scores based on signals
    const musicBias = inferBias(signals.music);
    const ttsBias = inferBias(signals.tts);
    const notifBias = inferBias(signals.notifications);
    
    // Weighted update (new signals have 30% weight)
    const alpha = 0.3;
    prefs.musicScore = prefs.musicScore * (1 - alpha) + this.biasToScore(musicBias.bias) * alpha;
    prefs.ttsScore = prefs.ttsScore * (1 - alpha) + this.biasToScore(ttsBias.bias) * alpha;
    prefs.notificationScore = prefs.notificationScore * (1 - alpha) + this.biasToScore(notifBias.bias) * alpha;
    prefs.sampleCount++;
    prefs.updatedAt = Date.now();
    
    this.preferences.set(signals.context, prefs);
  }

  private biasToScore(bias: 'prefer' | 'neutral' | 'avoid'): number {
    switch (bias) {
      case 'prefer': return 1;
      case 'avoid': return -1;
      case 'neutral': return 0;
    }
  }

  private createDefaultPrefs(context: AudioContext): PersistedPreferences {
    return {
      context,
      musicScore: 0,
      ttsScore: 0,
      notificationScore: 0,
      sampleCount: 0,
      updatedAt: Date.now(),
    };
  }

  private notifyListeners(recommendation: AudioRecommendation): void {
    for (const callback of this.listeners) {
      try {
        callback(recommendation);
      } catch (err) {
        console.error('[ListeningModel] Listener error:', err);
      }
    }
  }
}

// Singleton export
export const listeningModel = new ListeningModelClass();
