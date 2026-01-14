/**
 * AudioContextResolver - Environmental Sensor
 *
 * Translates app state → audio context hints.
 * This is a READ-ONLY sensor, not a controller.
 *
 * ## Design Principles
 * - Observes, never commands
 * - Emits hints, not imperatives
 * - Clients interpret hints voluntarily
 * - Never talks directly to AudioEngine
 *
 * ## What It Observes
 * - Current route/page
 * - App visibility (tab hidden, idle)
 * - Optional: user preference flags
 *
 * ## What It Emits
 * - Current AudioContext ('study', 'review', 'chat', etc.)
 * - Resolved AudioContextProfile
 */

import {
  AudioContext,
  AudioContextProfile,
  CONTEXT_PROFILES,
  ROUTE_CONTEXT_MAP,
} from './contextProfiles';

type ContextChangeCallback = (
  context: AudioContext,
  profile: AudioContextProfile
) => void;

class AudioContextResolverClass {
  private currentContext: AudioContext = 'browse';
  private currentProfile: AudioContextProfile = CONTEXT_PROFILES.browse;
  private listeners: Set<ContextChangeCallback> = new Set();
  private isVisible: boolean = true;
  private isIdle: boolean = false;

  constructor() {
    // Listen for visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isVisible = document.visibilityState === 'visible';
        this.recalculate();
      });
    }

    console.debug('[AudioContextResolver] Initialized');
  }

  // ===========================================================================
  // PUBLIC API (Read-Only)
  // ===========================================================================

  /**
   * Get the current audio context.
   */
  getContext(): AudioContext {
    return this.currentContext;
  }

  /**
   * Get the current context profile.
   */
  getProfile(): AudioContextProfile {
    return this.currentProfile;
  }

  /**
   * Check if a specific behavior is allowed in current context.
   */
  allows(behavior: 'tts' | 'notifications' | 'autoStart'): boolean {
    switch (behavior) {
      case 'tts':
        return this.currentProfile.allowTTS;
      case 'notifications':
        return this.currentProfile.allowNotifications;
      case 'autoStart':
        return this.currentProfile.autoStartMusic;
      default:
        return true;
    }
  }

  /**
   * Get effective profile with intelligence + autonomy adjustments.
   * This is the "smart" version of getProfile() that incorporates:
   * - Base context profile
   * - ListeningModel recommendations
   * - Autonomy consent
   */
  getEffectiveProfile(): AudioContextProfile & { 
    recommendedMusic: boolean;
    recommendedTTS: boolean;
    recommendedNotifications: boolean;
  } {
    const base = this.currentProfile;
    const context = this.currentContext;

    // Lazy import to avoid circular dependency
    // These will be checked at runtime
    let recommendedMusic = base.autoStartMusic;
    let recommendedTTS = base.allowTTS;
    let recommendedNotifications = base.allowNotifications;

    try {
      // Check ListeningModel recommendations
      const { listeningModel } = require('../intelligence/ListeningModel');
      const { autonomyManager } = require('../autonomy/AutonomyManager');

      // Apply recommendations if autonomy allows
      if (autonomyManager.shouldAutoApply(context, 'music')) {
        recommendedMusic = listeningModel.isRecommended(context, 'music') && base.autoStartMusic;
      }
      if (autonomyManager.shouldAutoApply(context, 'tts')) {
        recommendedTTS = listeningModel.isRecommended(context, 'tts') && base.allowTTS;
      }
      if (autonomyManager.shouldAutoApply(context, 'notifications')) {
        recommendedNotifications = listeningModel.isRecommended(context, 'notifications') && base.allowNotifications;
      }
    } catch {
      // Intelligence layer not loaded yet, use base profile
    }

    return {
      ...base,
      recommendedMusic,
      recommendedTTS,
      recommendedNotifications,
    };
  }

  /**
   * Check if behavior is recommended (considers intelligence + autonomy).
   */
  isRecommended(behavior: 'music' | 'tts' | 'notifications'): boolean {
    const effective = this.getEffectiveProfile();
    switch (behavior) {
      case 'music':
        return effective.recommendedMusic;
      case 'tts':
        return effective.recommendedTTS;
      case 'notifications':
        return effective.recommendedNotifications;
      default:
        return true;
    }
  }

  /**
   * Subscribe to context changes.
   * Returns unsubscribe function.
   */
  subscribe(callback: ContextChangeCallback): () => void {
    this.listeners.add(callback);
    
    // Emit current state immediately
    callback(this.currentContext, this.currentProfile);

    return () => {
      this.listeners.delete(callback);
    };
  }

  // ===========================================================================
  // ROUTE DETECTION (Called by RouteContextProvider)
  // ===========================================================================

  /**
   * Update context based on current route.
   * Called by RouteContextProvider when route changes.
   */
  setRoute(pathname: string): void {
    const detected = this.detectContextFromRoute(pathname);
    this.setContext(detected);
  }

  /**
   * Set idle state (e.g., user inactive for 5 minutes).
   */
  setIdle(idle: boolean): void {
    this.isIdle = idle;
    this.recalculate();
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private detectContextFromRoute(pathname: string): AudioContext {
    for (const { pattern, context } of ROUTE_CONTEXT_MAP) {
      if (pattern.test(pathname)) {
        return context;
      }
    }
    return 'browse';
  }

  private setContext(context: AudioContext): void {
    if (context === this.currentContext) return;

    const previousContext = this.currentContext;

    this.currentContext = context;
    this.currentProfile = CONTEXT_PROFILES[context];

    console.debug(
      `[AudioContextResolver] Context changed: ${previousContext} → ${context}`
    );

    // Notify listeners
    this.notifyListeners();
  }

  private recalculate(): void {
    // If tab hidden or idle, override to idle context
    if (!this.isVisible || this.isIdle) {
      if (this.currentContext !== 'idle') {
        this.setContext('idle');
      }
    }
  }

  private notifyListeners(): void {
    for (const callback of this.listeners) {
      try {
        callback(this.currentContext, this.currentProfile);
      } catch (err) {
        console.error('[AudioContextResolver] Listener error:', err);
      }
    }
  }
}

// Singleton export
export const audioContextResolver = new AudioContextResolverClass();
