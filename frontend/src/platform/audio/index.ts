/**
 * Platform Audio - Public API
 *
 * This is the public interface for the audio platform.
 * Import from '@/platform/audio' to access all audio services.
 *
 * ## Architecture Overview
 *
 * ```
 * Clients → SoundPolicy → AudioEngine → Output
 * ```
 *
 * - Clients: FocusMusicClient, (future: TTSClient, NotificationClient)
 * - SoundPolicy: Coordination layer, computes ducking
 * - AudioEngine: Pure execution, applies ducking to gain nodes
 *
 * ## Usage
 *
 * ```typescript
 * import { focusMusicClient, soundPolicy } from '@/platform/audio';
 *
 * // Play music
 * await audioEngine.playTrack('music', trackId);
 * focusMusicClient.activate();
 *
 * // Subscribe to ducking changes
 * soundPolicy.subscribe((ducking) => {
 *   const profile = ducking.get('focus-music');
 *   audioEngine.applyDucking(profile);
 * });
 * ```
 */

// Policy Layer
export { soundPolicy } from './policy/SoundPolicy';
export { computeDucking, getMostAggressiveProfile } from './policy/DuckingPolicy';
export type {
  AudioSource,
  AudioSourceKind,
  DuckingProfile,
  AudioSession,
  SessionContext,
  SessionEndReason,
  PlaybackState,
  AudioEngineStatus,
  AudioError,
  AudioClient,
} from './policy/types';
export { DUCKING_PROFILES } from './policy/types';

// Clients
export { focusMusicClient } from './clients/FocusMusicClient';
export { ttsClient } from './clients/TTSClient';
export type { TTSContext, TTSOptions } from './clients/TTSClient';
export { notificationClient } from './clients/NotificationClient';
export type { NotificationSound, NotificationOptions } from './clients/NotificationClient';

// Persistence Layer
export { audioDatabase } from './persistence/AudioDatabase';
export type {
  TrackMeta,
  Playlist,
  PlaylistTrack,
  TrackTag,
  ListeningHistoryEntry,
  PersistedPlaybackState,
} from './persistence/AudioDatabase';
export { sessionManager } from './persistence/SessionManager';
export type { SessionEndEvent } from './persistence/SessionManager';
export { playlistService } from './persistence/PlaylistService';

// Core
export { audioEngine } from './core/AudioEngine';
export { audioAnalysis } from './core/AudioAnalysis';
export type { AudioSignal } from './core/AudioAnalysis';
export type { TrackType } from './core/AudioPlayback';

// Hooks
export { useAudioSignals } from './hooks/useAudioSignals';
export { useSmartFlow } from './hooks/useSmartFlow';
export { useTTS } from './hooks/useTTS';

// Store
export { useAudioUIStore } from './store/useAudioUIStore';
export type { PlaybackStatus, LastError } from './store/useAudioUIStore';

// UI Components
export { AudioPlayerPopover } from './ui/AudioPlayerPopover';
export { AudioTrigger } from './ui/AudioTrigger';

// Context Layer
export { audioContextResolver } from './context/AudioContextResolver';
export { useAudioContext } from './context/useAudioContext';
export { RouteContextProvider } from './context/RouteContextProvider';
export { CONTEXT_PROFILES, ROUTE_CONTEXT_MAP } from './context/contextProfiles';
export type { AudioContext, AudioContextProfile } from './context/contextProfiles';

// Intelligence Layer
export { listeningModel } from './intelligence/ListeningModel';
export type {
  Bias,
  Confidence,
  AudioRecommendation,
  CapabilityRecommendation,
} from './intelligence/types';

// Autonomy Layer
export { autonomyManager } from './autonomy/AutonomyManager';
export { consentStore } from './autonomy/consentStore';
export { useAutonomy } from './autonomy/useAutonomy';
export type {
  AutonomyLevel,
  AutonomyCapability,
  AutonomyDecision,
} from './autonomy/types';

// Integration Hooks
export { useTTSAutoRead } from './hooks/useTTSAutoRead';
export { useTTSFlashcard } from './hooks/useTTSFlashcard';
export { useAutonomousAudio } from './hooks/useAutonomousAudio';
