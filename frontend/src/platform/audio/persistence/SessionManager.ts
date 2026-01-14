/**
 * SessionManager - Audio Session Lifecycle Management
 *
 * Manages session identity, position tracking, and history recording.
 *
 * ## Time Ownership Invariant
 * AudioEngine is the source of truth for time.
 * SessionManager RECORDS engine-reported time, never CALCULATES its own.
 *
 * ## Session Lifecycle
 * 1. startSession() - Creates session, records to history
 * 2. updatePosition() - Snapshots position periodically (10s intervals)
 * 3. endSession() - Records end reason and final position
 *
 * ## Session Termination Rules
 * Sessions end deterministically based on SessionEndReason:
 * - 'completed': Track ended naturally
 * - 'interrupted': Higher-priority client started
 * - 'user_stop': User pressed stop
 * - 'context_switch': User switched playlist/track
 * - 'system_suspend': Tab hidden, browser suspended
 */

import type { AudioSession, SessionEndReason, SessionContext } from '../policy/types';
import { audioDatabase, PersistedPlaybackState } from './AudioDatabase';

/**
 * Session end event data for ListeningModel integration.
 */
export interface SessionEndEvent {
  session: AudioSession;
  endReason: SessionEndReason;
  duration: number;  // in milliseconds
  finalPosition: number;
}

type SessionEndCallback = (event: SessionEndEvent) => void;

class SessionManager {
  private currentSession: AudioSession | null = null;
  private persistInterval: number | null = null;
  private readonly PERSIST_INTERVAL_MS = 10000; // 10 seconds
  private sessionEndCallbacks: Set<SessionEndCallback> = new Set();

  /**
   * Start a new audio session.
   * Records to listening_history and begins position tracking.
   */
  async startSession(
    sourceId: string,
    trackId: string,
    playlistId: string | null,
    context: SessionContext
  ): Promise<AudioSession> {
    // End any existing session first
    if (this.currentSession) {
      await this.endSession('context_switch');
    }

    const session: AudioSession = {
      sessionId: crypto.randomUUID(),
      sourceId,
      playlistId,
      trackId,
      startedAt: Date.now(),
      context,
    };

    this.currentSession = session;

    // Record to history
    await audioDatabase.recordSessionStart({
      sessionId: session.sessionId,
      trackId,
      playlistId,
      startedAt: session.startedAt,
      context,
    });

    console.debug('[SessionManager] Session started:', session.sessionId);
    return session;
  }

  /**
   * Update position snapshot.
   * INVARIANT: position comes from AudioEngine, never calculated here.
   *
   * @param position - Current playback position from AudioEngine.getCurrentTime()
   */
  async updatePosition(position: number): Promise<void> {
    if (!this.currentSession) return;

    const state: PersistedPlaybackState = {
      sourceId: this.currentSession.sourceId,
      trackId: this.currentSession.trackId,
      playlistId: this.currentSession.playlistId,
      position,
      updatedAt: Date.now(),
    };

    await audioDatabase.savePlaybackState(state);
  }

  /**
   * Start periodic position persistence.
   * Call this when playback begins.
   *
   * @param getPosition - Function that returns current position from AudioEngine
   */
  startPositionTracking(getPosition: () => number): void {
    this.stopPositionTracking();

    this.persistInterval = window.setInterval(() => {
      const position = getPosition();
      this.updatePosition(position);
    }, this.PERSIST_INTERVAL_MS);

    console.debug('[SessionManager] Position tracking started');
  }

  /**
   * Stop periodic position persistence.
   */
  stopPositionTracking(): void {
    if (this.persistInterval !== null) {
      clearInterval(this.persistInterval);
      this.persistInterval = null;
      console.debug('[SessionManager] Position tracking stopped');
    }
  }

  /**
   * End the current session with a deterministic reason.
   */
  async endSession(reason: SessionEndReason): Promise<void> {
    if (!this.currentSession) return;

    const session = this.currentSession;
    this.stopPositionTracking();

    // Get final position from persisted state
    const state = await audioDatabase.getPlaybackState(session.sourceId);
    const finalPosition = state?.position ?? 0;

    // Calculate duration
    const duration = Date.now() - session.startedAt;

    // Record session end
    await audioDatabase.recordSessionEnd(
      session.sessionId,
      reason,
      finalPosition
    );

    // Notify listeners (for ListeningModel integration)
    const event: SessionEndEvent = {
      session,
      endReason: reason,
      duration,
      finalPosition,
    };
    this.notifySessionEnd(event);

    console.debug('[SessionManager] Session ended:', session.sessionId, reason);
    this.currentSession = null;
  }

  /**
   * Subscribe to session end events.
   * Used by ListeningModel to learn from session behavior.
   */
  onSessionEnd(callback: SessionEndCallback): () => void {
    this.sessionEndCallbacks.add(callback);
    return () => this.sessionEndCallbacks.delete(callback);
  }

  private notifySessionEnd(event: SessionEndEvent): void {
    for (const callback of this.sessionEndCallbacks) {
      try {
        callback(event);
      } catch (err) {
        console.error('[SessionManager] Session end callback error:', err);
      }
    }
  }

  /**
   * Get the current active session.
   */
  getCurrentSession(): AudioSession | null {
    return this.currentSession;
  }

  /**
   * Check if there's a resumable session for a source.
   */
  async getResumableState(sourceId: string): Promise<PersistedPlaybackState | null> {
    const state = await audioDatabase.getPlaybackState(sourceId);
    if (!state) return null;

    // Consider stale after 24 hours
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;
    const age = Date.now() - state.updatedAt;

    if (age > MAX_AGE_MS) {
      await audioDatabase.clearPlaybackState(sourceId);
      return null;
    }

    return state;
  }

  /**
   * Clear resume state (after successful resume or user cancellation).
   */
  async clearResumeState(sourceId: string): Promise<void> {
    await audioDatabase.clearPlaybackState(sourceId);
  }
}

export const sessionManager = new SessionManager();
