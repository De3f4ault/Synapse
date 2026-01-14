/**
 * FocusMusicClient - First-Class Audio Client
 *
 * Wraps focus music playback and registers with SoundPolicy.
 * Integrates with SessionManager for session tracking.
 *
 * ## Client Lifecycle
 * - Registers ONCE at construction
 * - Never unregisters
 * - Only toggles active/inactive at runtime
 *
 * ## Session Integration
 * - Starts session on activate()
 * - Ends session on deactivate()
 * - Position tracking runs while active
 */

import { soundPolicy } from '../policy/SoundPolicy';
import { sessionManager } from '../persistence/SessionManager';
import type { AudioSource, SessionContext, SessionEndReason } from '../policy/types';

const FOCUS_MUSIC_SOURCE: AudioSource = {
  id: 'focus-music',
  priority: 10,
  duckable: true,
  ducksOthers: false,
  kind: 'music',
};

class FocusMusicClient {
  private _isActive = false;
  private currentTrackId: string | null = null;
  private currentPlaylistId: string | null = null;
  private getCurrentTime: (() => number) | null = null;

  constructor() {
    soundPolicy.registerSource(FOCUS_MUSIC_SOURCE);
    console.debug('[FocusMusicClient] Registered with SoundPolicy');
  }

  get source(): AudioSource {
    return FOCUS_MUSIC_SOURCE;
  }

  isActive(): boolean {
    return this._isActive;
  }

  /**
   * Get the current playlist ID (if any).
   */
  getPlaylistId(): string | null {
    return this.currentPlaylistId;
  }

  /**
   * Set the time getter for position tracking.
   * Call this after AudioEngine is available.
   */
  setTimeGetter(getter: () => number): void {
    this.getCurrentTime = getter;
  }

  /**
   * Activate with session tracking.
   */
  async activate(
    trackId: string,
    playlistId: string | null = null,
    context: SessionContext = 'study'
  ): Promise<void> {
    if (this._isActive && this.currentTrackId === trackId) {
      return; // Already playing this track
    }

    this._isActive = true;
    this.currentTrackId = trackId;
    this.currentPlaylistId = playlistId;

    soundPolicy.setActive(FOCUS_MUSIC_SOURCE.id, true);

    // Start session
    await sessionManager.startSession(
      FOCUS_MUSIC_SOURCE.id,
      trackId,
      playlistId,
      context
    );

    // Start position tracking if time getter available
    if (this.getCurrentTime) {
      sessionManager.startPositionTracking(this.getCurrentTime);
    }
  }

  /**
   * Deactivate with session end.
   */
  async deactivate(reason: SessionEndReason = 'user_stop'): Promise<void> {
    if (!this._isActive) return;

    this._isActive = false;
    this.currentTrackId = null;
    this.currentPlaylistId = null;

    soundPolicy.setActive(FOCUS_MUSIC_SOURCE.id, false);
    await sessionManager.endSession(reason);
  }

  /**
   * Get resume state if available.
   */
  async getResumeState() {
    return sessionManager.getResumableState(FOCUS_MUSIC_SOURCE.id);
  }

  /**
   * Clear resume state.
   */
  async clearResumeState(): Promise<void> {
    await sessionManager.clearResumeState(FOCUS_MUSIC_SOURCE.id);
  }

  /**
   * Check if music should auto-start in current context.
   * Considers: context profile + ListeningModel + autonomy consent.
   */
  shouldAutoStart(): boolean {
    try {
      const { audioContextResolver } = require('../context/AudioContextResolver');
      return audioContextResolver.isRecommended('music');
    } catch {
      // Context layer not loaded, default to false (user must start manually)
      return false;
    }
  }

  /**
   * Record that user manually enabled/disabled music.
   * This feeds the ListeningModel to improve future recommendations.
   */
  recordManualAction(action: 'enabled' | 'disabled'): void {
    try {
      const { audioContextResolver } = require('../context/AudioContextResolver');
      const { listeningModel } = require('../intelligence/ListeningModel');
      const context = audioContextResolver.getContext();
      listeningModel.recordManualOverride(context, 'music', action);
    } catch {
      // Intelligence layer not loaded, ignore
    }
  }
}

export const focusMusicClient = new FocusMusicClient();
