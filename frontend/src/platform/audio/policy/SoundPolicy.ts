/**
 * SoundPolicy - The Coordination Brain
 *
 * Manages registration of audio sources and computes optimal ducking state.
 * Does NOT touch AudioContext or any audio nodes.
 *
 * ## Responsibilities
 * - Track registered sources
 * - Track active/inactive state
 * - Compute ducking via DuckingPolicy
 * - Notify listeners on state changes
 *
 * ## Client Lifecycle Contract
 * - Clients register ONCE at construction time
 * - Clients are NEVER unregistered (singleton pattern)
 * - Only active/inactive toggles at runtime
 * - Hot reload: clients re-register on module reload
 */

import { AudioSource, DuckingProfile } from './types';
import { computeDucking } from './DuckingPolicy';

type DuckingListener = (ducking: Map<string, DuckingProfile>) => void;

class SoundPolicy {
  private sources = new Map<string, AudioSource>();
  private activeSources = new Set<string>();
  private listeners = new Set<DuckingListener>();

  /**
   * Register an audio source.
   * Call once at client construction time.
   */
  registerSource(source: AudioSource): void {
    if (this.sources.has(source.id)) {
      // Already registered (hot reload case) - update definition
      console.debug(`[SoundPolicy] Re-registering source: ${source.id}`);
    }
    this.sources.set(source.id, source);
  }

  /**
   * Check if a source is registered.
   */
  hasSource(id: string): boolean {
    return this.sources.has(id);
  }

  /**
   * Get a registered source by ID.
   */
  getSource(id: string): AudioSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Set a source as active or inactive.
   * This is the primary runtime control.
   */
  setActive(id: string, active: boolean): void {
    if (!this.sources.has(id)) {
      console.warn(`[SoundPolicy] Cannot set active: source not registered: ${id}`);
      return;
    }

    const wasActive = this.activeSources.has(id);
    if (active && !wasActive) {
      this.activeSources.add(id);
      console.debug(`[SoundPolicy] Source activated: ${id}`);
      this.notifyListeners();
    } else if (!active && wasActive) {
      this.activeSources.delete(id);
      console.debug(`[SoundPolicy] Source deactivated: ${id}`);
      this.notifyListeners();
    }
  }

  /**
   * Check if a source is currently active.
   */
  isActive(id: string): boolean {
    return this.activeSources.has(id);
  }

  /**
   * Get all active source IDs.
   */
  getActiveSources(): string[] {
    return Array.from(this.activeSources);
  }

  /**
   * Subscribe to ducking state changes.
   * Returns unsubscribe function.
   */
  subscribe(listener: DuckingListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.computeCurrentDucking());
    return () => this.listeners.delete(listener);
  }

  /**
   * Compute current ducking state.
   */
  computeCurrentDucking(): Map<string, DuckingProfile> {
    return computeDucking(this.sources, this.activeSources);
  }

  /**
   * Notify all listeners of ducking state change.
   */
  private notifyListeners(): void {
    const ducking = this.computeCurrentDucking();
    this.listeners.forEach(listener => listener(ducking));
  }
}

// Singleton instance
export const soundPolicy = new SoundPolicy();
