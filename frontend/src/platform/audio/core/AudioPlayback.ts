/**
 * AudioPlayback - Track Control & Transitions
 *
 * Manages source nodes, track loading, and crossfade transitions.
 * Behavior without authority - uses context time, doesn't own clock.
 *
 * ## Responsibilities
 * - playTrack / stopTrack
 * - crossfadeTo
 * - Source node lifecycle
 * - Buffer caching
 *
 * ## Does NOT
 * - Own AudioContext
 * - Make session decisions
 * - Own ducking policy
 */

import { audioDatabase } from '@/platform/audio/persistence/AudioDatabase';

export type TrackType = 'music' | 'ambience';

export type LastErrorType = 'decode' | 'network' | 'permission' | 'unknown';

export interface PlaybackCallbacks {
  setPlaybackStatus: (status: 'loading' | 'playing' | 'paused' | 'error') => void;
  setLastError: (error: { type: LastErrorType; message: string; timestamp: number } | null) => void;
}

export interface PlaybackHandles {
  masterGain: GainNode;
  musicGain: GainNode;
  ambienceGain: GainNode;
}

export class AudioPlayback {
  private context: AudioContext | null = null;
  private handles: PlaybackHandles | null = null;
  private callbacks: PlaybackCallbacks | null = null;

  // Sources (single-use per Web Audio API)
  private musicSource: AudioBufferSourceNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;

  // Buffer cache
  private buffers: Map<string, AudioBuffer> = new Map();

  // Generation token for cancellation
  private loadGeneration: number = 0;

  /**
   * Initialize with references from AudioEngine.
   */
  init(ctx: AudioContext, handles: PlaybackHandles, callbacks: PlaybackCallbacks): void {
    this.context = ctx;
    this.handles = handles;
    this.callbacks = callbacks;
  }

  /**
   * Play a specific track.
   * Uses generation tokens to cancel stale decode operations.
   */
  async playTrack(type: TrackType, urlOrBlob: string | Blob): Promise<void> {
    if (!this.context || !this.handles || !this.callbacks) return;

    const thisGeneration = ++this.loadGeneration;
    const { setPlaybackStatus, setLastError } = this.callbacks;

    try {
      setPlaybackStatus('loading');

      const buffer = await this.loadBuffer(urlOrBlob, thisGeneration);
      if (!buffer) return; // Cancelled

      // Stop existing source
      this.stopTrack(type);

      // Create new source
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Connect to appropriate gain
      if (type === 'music') {
        source.connect(this.handles.musicGain);
        this.musicSource = source;
      } else {
        source.connect(this.handles.ambienceGain);
        this.ambienceSource = source;
      }

      source.start(0);
      setPlaybackStatus('playing');
      setLastError(null);

    } catch (err) {
      if (thisGeneration === this.loadGeneration) {
        console.error(`Failed to play ${type} track:`, err);
        setPlaybackStatus('error');
        setLastError({
          type: err instanceof TypeError ? 'network' : 'decode',
          message: err instanceof Error ? err.message : 'Unknown error',
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Stop a track. Properly disposes the BufferSourceNode.
   */
  stopTrack(type: TrackType): void {
    if (type === 'music' && this.musicSource) {
      try { this.musicSource.stop(); } catch { /* Already stopped */ }
      this.musicSource.disconnect();
      this.musicSource = null;
    } else if (type === 'ambience' && this.ambienceSource) {
      try { this.ambienceSource.stop(); } catch { /* Already stopped */ }
      this.ambienceSource.disconnect();
      this.ambienceSource = null;
    }

    // Update status if no sources remain
    if (!this.musicSource && !this.ambienceSource) {
      this.callbacks?.setPlaybackStatus('paused');
    }
  }

  /**
   * Crossfade to a new track.
   */
  async crossfadeTo(
    type: TrackType,
    urlOrBlob: string | Blob,
    duration: number = 2.0
  ): Promise<void> {
    if (!this.context || !this.handles || !this.callbacks) return;

    const gain = type === 'music' ? this.handles.musicGain : this.handles.ambienceGain;
    const now = this.context.currentTime;
    const currentGain = gain.gain.value;

    const oldSource = type === 'music' ? this.musicSource : this.ambienceSource;

    // Fade out current
    if (oldSource) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(currentGain, now);
      gain.gain.linearRampToValueAtTime(0, now + duration / 2);
    }

    const thisGeneration = ++this.loadGeneration;

    try {
      const buffer = await this.loadBuffer(urlOrBlob, thisGeneration);
      if (!buffer) return;

      // Schedule old source cleanup
      if (oldSource) {
        setTimeout(() => {
          try { oldSource.stop(); } catch { /* Already stopped */ }
          oldSource.disconnect();
        }, (duration / 2) * 1000);
      }

      // Create new source
      const newSource = this.context.createBufferSource();
      newSource.buffer = buffer;
      newSource.loop = true;
      newSource.connect(gain);

      if (type === 'music') {
        this.musicSource = newSource;
      } else {
        this.ambienceSource = newSource;
      }

      // Fade in
      gain.gain.setValueAtTime(0, now + duration / 2);
      newSource.start(0);
      gain.gain.linearRampToValueAtTime(currentGain, now + duration);

      this.callbacks.setPlaybackStatus('playing');
      this.callbacks.setLastError(null);

    } catch (err) {
      if (thisGeneration === this.loadGeneration) {
        console.error(`Failed to crossfade ${type} track:`, err);
        this.callbacks.setPlaybackStatus('error');
        this.callbacks.setLastError({
          type: err instanceof TypeError ? 'network' : 'decode',
          message: err instanceof Error ? err.message : 'Unknown error',
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Play a one-shot sound (fire-and-forget).
   * Used for notifications, alerts, UI feedback.
   * No looping, no state storage, auto-cleanup on end.
   */
  async playOneShot(
    url: string,
    options: { volume?: number; destination?: GainNode } = {}
  ): Promise<void> {
    if (!this.context || !this.handles) {
      throw new Error('AudioPlayback not initialized');
    }

    const { volume = 1, destination } = options;

    // Load buffer (use cache if available)
    const buffer = await this.loadOneShotBuffer(url);
    
    // Create one-shot source
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Create dedicated gain node for volume control
    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    // Connect: source → gain → (destination or masterGain)
    source.connect(gainNode);
    gainNode.connect(destination || this.handles.masterGain);

    // Play and return promise that resolves on end
    return new Promise((resolve, reject) => {
      source.onended = () => {
        gainNode.disconnect();
        resolve();
      };

      try {
        source.start(0);
      } catch (err) {
        gainNode.disconnect();
        reject(err);
      }
    });
  }

  /**
   * Load buffer for one-shot sounds (simpler than track loading).
   */
  private async loadOneShotBuffer(url: string): Promise<AudioBuffer> {
    if (!this.context) {
      throw new Error('AudioPlayback not initialized');
    }

    // Check cache first
    if (this.buffers.has(url)) {
      return this.buffers.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load sound: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.context.decodeAudioData(arrayBuffer);

    // Cache it
    this.buffers.set(url, buffer);

    return buffer;
  }

  /**
   * Check if any source is active.
   */
  hasActiveSources(): boolean {
    return this.musicSource !== null || this.ambienceSource !== null;
  }

  /**
   * Get active source types.
   */
  getActiveSources(): string[] {
    const sources: string[] = [];
    if (this.musicSource) sources.push('music');
    if (this.ambienceSource) sources.push('ambience');
    return sources;
  }

  /**
   * Load and cache an audio buffer.
   */
  private async loadBuffer(
    urlOrBlob: string | Blob,
    generation: number
  ): Promise<AudioBuffer | null> {
    if (!this.context) return null;

    const key = typeof urlOrBlob === 'string' ? urlOrBlob : `blob-${Date.now()}`;

    if (this.buffers.has(key)) {
      return this.buffers.get(key)!;
    }

    let arrayBuffer: ArrayBuffer | null = null;

    if (typeof urlOrBlob === 'string') {
      if (urlOrBlob.startsWith('/') || urlOrBlob.startsWith('http')) {
        const response = await fetch(urlOrBlob);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        arrayBuffer = await response.arrayBuffer();
      } else {
        const blob = await audioDatabase.getTrackBlob(urlOrBlob);
        if (blob) {
          arrayBuffer = await blob.arrayBuffer();
        } else {
          throw new Error(`Track ${urlOrBlob} not found in Crate.`);
        }
      }
    } else {
      arrayBuffer = await urlOrBlob.arrayBuffer();
    }

    // Check for cancellation
    if (generation !== this.loadGeneration) {
      console.log('Load cancelled: superseded by newer request');
      return null;
    }

    if (!arrayBuffer) {
      throw new Error('Could not load audio data.');
    }

    const buffer = await this.context.decodeAudioData(arrayBuffer);

    // Check again after decode
    if (generation !== this.loadGeneration) {
      console.log('Load cancelled: superseded during decode');
      return null;
    }

    // Cache it
    if (typeof urlOrBlob === 'string') {
      this.buffers.set(key, buffer);
    }

    return buffer;
  }
}
