/**
 * Platform Audio Types
 *
 * Core contracts for the audio platform. These types define the system's
 * language and should be treated as immutable after Wave 1 completion.
 *
 * ## System Invariants
 *
 * ### Time Ownership
 * AudioEngine is the source of truth for time.
 * SessionManager is a recorder, never a calculator.
 *
 * ### Multi-Tab Limitation
 * Phase 5 assumes a single active execution context.
 * Multi-tab audio coordination is intentionally out of scope.
 * Do NOT attempt BroadcastChannel or leader election here.
 */

// =============================================================================
// AUDIO SOURCE
// =============================================================================

/**
 * Represents an audio client registered with the policy layer.
 * Lower priority = more important (1 = critical, 10 = background).
 */
export interface AudioSource {
  id: string;
  priority: number;
  duckable: boolean;
  ducksOthers: boolean;
  kind: AudioSourceKind;
}

export type AudioSourceKind = 'music' | 'speech' | 'alert' | 'ambient';

// =============================================================================
// DUCKING
// =============================================================================

export interface DuckingProfile {
  targetGain: number;  // 0-1
  attack: number;      // Ramp down time (seconds)
  release: number;     // Ramp up time (seconds)
}

export type DuckingProfileName = 'none' | 'music' | 'speech' | 'alert' | 'ambient';

export const DUCKING_PROFILES: { [K in DuckingProfileName]: DuckingProfile } = {
  none:    { targetGain: 1.0,  attack: 0,    release: 0    },
  music:   { targetGain: 0.15, attack: 0.8,  release: 0.8  },
  speech:  { targetGain: 0.25, attack: 0.5,  release: 0.5  },
  alert:   { targetGain: 0.40, attack: 0.3,  release: 0.3  },
  ambient: { targetGain: 0.5,  attack: 1.0,  release: 1.0  },
};

// =============================================================================
// SESSION
// =============================================================================

/**
 * Represents a playback session with identity and context.
 */
export interface AudioSession {
  sessionId: string;
  sourceId: string;
  playlistId: string | null;
  trackId: string;
  startedAt: number;
  context: SessionContext;
}

export type SessionContext = 'study' | 'review' | 'ambient' | 'system';

/**
 * Deterministic reasons for session termination.
 * Stored in listening_history for analytics and UX.
 */
export type SessionEndReason =
  | 'completed'        // Track ended naturally
  | 'interrupted'      // Higher-priority client started
  | 'user_stop'        // User pressed stop
  | 'context_switch'   // User switched playlist/track
  | 'system_suspend';  // Tab hidden, browser suspended

// =============================================================================
// PLAYBACK STATE
// =============================================================================

/**
 * Snapshot of current playback position.
 * Position is ALWAYS recorded from AudioEngine, never calculated.
 */
export interface PlaybackState {
  sourceId: string;
  trackId: string;
  position: number;     // seconds (from AudioEngine)
  duration: number;     // seconds
  isLooping: boolean;
  updatedAt: number;    // timestamp of snapshot
}

// =============================================================================
// ENGINE FEEDBACK
// =============================================================================

/**
 * Read-only status from AudioEngine.
 * Consumed by UI and diagnostics, never by policy.
 */
export interface AudioEngineStatus {
  contextState: 'suspended' | 'running' | 'closed';
  activeSources: string[];
  lastError: AudioError | null;
}

export interface AudioError {
  type: 'decode' | 'network' | 'permission' | 'autoplay' | 'unknown';
  message: string;
  timestamp: number;
}

// =============================================================================
// CLIENT LIFECYCLE
// =============================================================================

/**
 * Client registration contract.
 *
 * Clients register ONCE at construction time.
 * Clients are NEVER unregistered (singleton pattern).
 * Only active/inactive toggles at runtime.
 */
export interface AudioClient {
  readonly source: AudioSource;
  isActive(): boolean;
}
