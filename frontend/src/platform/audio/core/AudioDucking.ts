/**
 * AudioDucking - Gain Math & Application
 *
 * Handles ducking state management and gain scheduling.
 * Takes instructions from policy, does NOT make decisions.
 *
 * ## Responsibilities
 * - Stack-based ducking state
 * - Gain curve scheduling
 * - Restore logic
 *
 * ## Does NOT
 * - Decide WHO ducks
 * - Know about sessions
 * - Own any clocks
 */

import type { DuckingProfile } from '@/platform/audio/policy/types';

/**
 * Legacy ducking profiles (for backward compatibility with duck/restore API)
 */
type LegacyDuckProfile = {
  strength: number;  // Target gain (0.15 = 15%)
  rampTime: number;  // Seconds to reach target
};

const LEGACY_DUCK_PROFILES: Record<string, LegacyDuckProfile> = {
  'media':  { strength: 0.15, rampTime: 0.8 },
  'speech': { strength: 0.25, rampTime: 0.5 },
  'alert':  { strength: 0.40, rampTime: 0.3 },
};

export type DuckingCallback = (isDucked: boolean) => void;

export class AudioDucking {
  private duckingGain: GainNode | null = null;
  private context: AudioContext | null = null;
  private duckingStack: Map<string, string> = new Map();  // reason -> profile
  private onDuckingChange: DuckingCallback | null = null;

  /**
   * Initialize with references from AudioEngine.
   */
  init(ctx: AudioContext, duckingGain: GainNode, callback: DuckingCallback): void {
    this.context = ctx;
    this.duckingGain = duckingGain;
    this.onDuckingChange = callback;
  }

  /**
   * Apply a ducking profile from SoundPolicy.
   * This is the policy-driven API.
   */
  applyProfile(profile: DuckingProfile): void {
    if (!this.context || !this.duckingGain) return;

    const now = this.context.currentTime;
    this.duckingGain.gain.cancelScheduledValues(now);
    this.duckingGain.gain.linearRampToValueAtTime(
      profile.targetGain,
      now + profile.attack
    );

    this.notifyChange(profile.targetGain < 1.0);
  }

  /**
   * Legacy API: Duck audio for a given reason.
   * INVARIANT: No-op if not initialized.
   */
  duck(reason: string, profile: keyof typeof LEGACY_DUCK_PROFILES = 'media'): void {
    if (!this.context || !this.duckingGain) return;

    if (!this.duckingStack.has(reason)) {
      this.duckingStack.set(reason, profile);
      this.updateDuckingState();
    }
  }

  /**
   * Legacy API: Restore audio from a specific ducking reason.
   * INVARIANT: No-op if not initialized.
   */
  restore(reason: string): void {
    if (!this.context || !this.duckingGain) return;

    if (this.duckingStack.has(reason)) {
      this.duckingStack.delete(reason);
      this.updateDuckingState();
    }
  }

  /**
   * Calculate and apply the strongest (lowest) duck profile from active reasons.
   */
  private updateDuckingState(): void {
    if (!this.context || !this.duckingGain) return;

    const isDucked = this.duckingStack.size > 0;

    let targetStrength = 1.0;
    let targetRampTime = 0.8;

    if (isDucked) {
      for (const profileName of this.duckingStack.values()) {
        const profile = LEGACY_DUCK_PROFILES[profileName] ?? LEGACY_DUCK_PROFILES['media']!;
        if (profile.strength < targetStrength) {
          targetStrength = profile.strength;
          targetRampTime = profile.rampTime;
        }
      }
    }

    const now = this.context.currentTime;
    this.duckingGain.gain.cancelScheduledValues(now);
    this.duckingGain.gain.linearRampToValueAtTime(targetStrength, now + targetRampTime);

    this.notifyChange(isDucked);
  }

  /**
   * Notify external listener about ducking state change.
   */
  private notifyChange(isDucked: boolean): void {
    this.onDuckingChange?.(isDucked);
  }
}
