/**
 * AudioEngine - The Sovereign Coordinator
 *
 * Owns the AudioContext and delegates to specialized modules.
 * This is the conductor, not a musician.
 *
 * ## Responsibilities
 * - AudioContext lifecycle (init, suspend, resume)
 * - Time ownership (getCurrentTime)
 * - Status reporting (getStatus)
 * - Delegation to specialized modules
 *
 * ## Does NOT contain
 * - Node creation (→ AudioGraph)
 * - Gain curves (→ AudioDucking)
 * - Playback logic (→ AudioPlayback)
 *
 * ## Invariants
 * - AudioEngine is the source of truth for TIME
 * - SessionManager RECORDS engine time, never calculates
 * - Singleton pattern - lives for app lifetime
 */

import { useAudioUIStore } from '@/platform/audio/store/useAudioUIStore';
import { buildAudioGraph, AudioGraphHandles } from './AudioGraph';
import { AudioDucking } from './AudioDucking';
import { AudioPlayback, TrackType } from './AudioPlayback';
import type { DuckingProfile, AudioEngineStatus } from '@/platform/audio/policy/types';

class AudioEngine {
  private context: AudioContext | null = null;
  private handles: AudioGraphHandles | null = null;

  // Delegates
  private playback = new AudioPlayback();
  private ducking = new AudioDucking();

  private static instance: AudioEngine;

  private constructor() {
    // Private constructor for Singleton
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize the AudioContext lazily.
   * INVARIANT: This method is idempotent.
   */
  public async init(): Promise<void> {
    if (this.context) {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return;
    }

    // Create context
    this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Build audio graph
    this.handles = buildAudioGraph(this.context);

    // Initialize delegates
    const store = useAudioUIStore.getState();

    this.playback.init(this.context, {
      masterGain: this.handles.masterGain,
      musicGain: this.handles.musicGain,
      ambienceGain: this.handles.ambienceGain,
    }, {
      setPlaybackStatus: store.setPlaybackStatus,
      setLastError: store.setLastError,
    });

    this.ducking.init(this.context, this.handles.duckingGain, (isDucked) => {
      store.setIsDucked(isDucked);
    });

    // Sync initial volume
    this.syncVolume();
  }

  /**
   * Suspend the AudioContext. Idempotent.
   */
  public async suspend(): Promise<void> {
    if (this.context && this.context.state === 'running') {
      await this.context.suspend();
      useAudioUIStore.getState().setPlaybackStatus('paused');
    }
  }

  /**
   * Resume the AudioContext. Idempotent.
   */
  public async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
      if (this.playback.hasActiveSources()) {
        useAudioUIStore.getState().setPlaybackStatus('playing');
      }
    }
  }

  // ===========================================================================
  // PLAYBACK (delegated)
  // ===========================================================================

  public async playTrack(type: TrackType, urlOrBlob: string | Blob): Promise<void> {
    await this.init();
    return this.playback.playTrack(type, urlOrBlob);
  }

  public stopTrack(type: TrackType): void {
    this.playback.stopTrack(type);
  }

  public async crossfadeTo(type: TrackType, urlOrBlob: string | Blob, duration?: number): Promise<void> {
    await this.init();
    return this.playback.crossfadeTo(type, urlOrBlob, duration);
  }

  public isActuallyPlaying(): boolean {
    return this.context?.state === 'running' && this.playback.hasActiveSources();
  }

  /**
   * Play a one-shot sound (fire-and-forget).
   * Used by NotificationClient.
   */
  public async playOneShot(url: string, options?: { volume?: number }): Promise<void> {
    await this.init();
    return this.playback.playOneShot(url, options);
  }

  // ===========================================================================
  // DUCKING (delegated)
  // ===========================================================================

  public applyDucking(profile: DuckingProfile): void {
    this.ducking.applyProfile(profile);
  }

  public duck(reason: string, profile?: 'media' | 'speech' | 'alert'): void {
    this.ducking.duck(reason, profile);
  }

  public restore(reason: string): void {
    this.ducking.restore(reason);
  }

  // ===========================================================================
  // VOLUME
  // ===========================================================================

  public syncVolume(): void {
    if (!this.context || !this.handles) return;

    const state = useAudioUIStore.getState();
    const now = this.context.currentTime;

    this.handles.masterGain.gain.setTargetAtTime(state.volume, now, 0.1);
    this.handles.musicGain.gain.setTargetAtTime(state.mix.music, now, 0.1);
    this.handles.ambienceGain.gain.setTargetAtTime(state.mix.ambience, now, 0.1);
  }

  // ===========================================================================
  // STATUS & TIME
  // ===========================================================================

  /**
   * Get current engine status for observability.
   * INVARIANT: Read-only feedback, not control.
   */
  public getStatus(): AudioEngineStatus {
    return {
      contextState: (this.context?.state ?? 'closed') as 'suspended' | 'running' | 'closed',
      activeSources: this.playback.getActiveSources(),
      lastError: useAudioUIStore.getState().lastError,
    };
  }

  /**
   * Get current audio context time.
   * INVARIANT: AudioEngine is the source of truth for time.
   */
  public getCurrentTime(): number {
    return this.context?.currentTime ?? 0;
  }
}

export const audioEngine = AudioEngine.getInstance();
