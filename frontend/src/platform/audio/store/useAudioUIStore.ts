
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { audioDatabase, TrackMeta } from '../persistence/AudioDatabase';

/**
 * Playback status representing the actual state of the audio system.
 * - 'idle': No track loaded, engine may not be initialized
 * - 'loading': Track is being fetched/decoded
 * - 'playing': Audio is actively playing
 * - 'paused': Context suspended or sources stopped
 * - 'error': Last operation failed (check lastError for details)
 */
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * Structured error information for observability.
 */
export interface LastError {
  type: 'decode' | 'network' | 'permission' | 'unknown';
  message: string;
  timestamp: number;
}

/**
 * Focus Audio State Store
 * 
 * ## State Flow Direction
 * - State flows DOWNWARD from store → engine for INTENT (volume, mix, playIntent)
 * - State flows UPWARD from engine → store for DERIVED STATUS ONLY (isDucked, playbackStatus)
 * - Store actions call engine methods EXPLICITLY (no subscriptions)
 * 
 * ## Intent vs Truth
 * - `playIntent`: User's DESIRED state ("I want music playing")
 * - `playbackStatus`: ACTUAL state from engine ("audio is currently flowing")
 * - Use `audioEngine.isActuallyPlaying()` for definitive playback truth
 */
interface AudioUIState {
  // User Intent
  playIntent: boolean;  // User wants audio to play (renamed from isPlaying)
  isMuted: boolean;
  
  // Derived Status (Read-only, set by engine)
  isDucked: boolean;
  playbackStatus: PlaybackStatus;
  lastError: LastError | null;
  
  // Volume Controls
  volume: number; // Master volume 0-1
  mix: {
    music: number;    // 0-1
    ambience: number; // 0-1
  };
  
  // Track Selection
  activeMusicId: string | null;
  activeAmbienceId: string | null;
  
  // The Crate (Metadata Cache)
  crateTracks: TrackMeta[];
  
  // Feature Flags / Settings
  synesthesiaEnabled: boolean;
  autoDuckEnabled: boolean;
  ttsEnabled: boolean;
  ttsRate: number;  // 0.5 - 2.0
  
  // Intent Actions (call audioEngine explicitly)
  setPlayIntent: (intent: boolean) => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  setMix: (type: 'music' | 'ambience', level: number) => void;
  setActiveTrack: (type: 'music' | 'ambience', id: string | null) => void;
  toggleSynesthesia: () => void;
  toggleAutoDuck: () => void;
  setTtsEnabled: (enabled: boolean) => void;
  setTtsRate: (rate: number) => void;
  
  // Status Actions (called by engine only)
  setIsDucked: (ducked: boolean) => void;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  setLastError: (error: LastError | null) => void;
  
  // Crate Actions
  refreshCrate: () => Promise<void>;
  addToCrate: (file: File, category?: 'music' | 'ambience') => Promise<void>;
  removeFromCrate: (id: string) => Promise<void>;
}

export const useAudioUIStore = create<AudioUIState>()(
  persist(
    (set, get) => ({
      // Initial State
      playIntent: false,
      isMuted: false,
      isDucked: false,
      playbackStatus: 'idle',
      lastError: null,
      volume: 0.8,
      
      mix: {
        music: 0.7,
        ambience: 0.3,
      },
      
      activeMusicId: 'default-lofi',
      activeAmbienceId: null,
      crateTracks: [],
      
      synesthesiaEnabled: false,
      autoDuckEnabled: true,
      ttsEnabled: true,
      ttsRate: 1.0,
      
      // Intent Actions - explicitly call engine
      setPlayIntent: (playIntent) => {
        set({ playIntent });
        // Engine integration handled by consuming components
      },
      
      togglePlayPause: () => {
        const newIntent = !get().playIntent;
        set({ playIntent: newIntent });
        // Engine resume/suspend handled by FocusTrigger component
      },
      
      setVolume: (volume) => {
        set({ volume });
        // Lazy import to avoid circular dependency at module load
        import('@/platform/audio').then(({ audioEngine }) => {
          audioEngine.syncVolume();
        });
      },
      
      setMix: (type, level) => {
        set((state) => ({
          mix: { ...state.mix, [type]: level }
        }));
        import('@/platform/audio').then(({ audioEngine }) => {
          audioEngine.syncVolume();
        });
      },
      
      setActiveTrack: (type, id) => {
        if (type === 'music') {
          set({ activeMusicId: id });
        } else {
          set({ activeAmbienceId: id });
        }
      },
      
      toggleSynesthesia: () => set((state) => ({ 
        synesthesiaEnabled: !state.synesthesiaEnabled 
      })),
      
      toggleAutoDuck: () => set((state) => ({ 
        autoDuckEnabled: !state.autoDuckEnabled 
      })),
      
      setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),
      setTtsRate: (ttsRate) => set({ ttsRate: Math.max(0.5, Math.min(2, ttsRate)) }),
      
      // Status Actions - called by engine (read-only from UI perspective)
      setIsDucked: (isDucked) => set({ isDucked }),
      setPlaybackStatus: (playbackStatus) => set({ playbackStatus }),
      setLastError: (lastError) => set({ lastError }),
      
      // Crate Actions
      refreshCrate: async () => {
        const tracks = await audioDatabase.getTracks();
        set({ crateTracks: tracks });
      },
      
      addToCrate: async (file, category = 'music') => {
        await audioDatabase.addTrack(file, category);
        const tracks = await audioDatabase.getTracks();
        set({ crateTracks: tracks });
      },
      
      removeFromCrate: async (id) => {
        // Stop playback if this track is active
        const state = get();
        if (state.activeMusicId === id) {
          set({ activeMusicId: null });
          import('@/platform/audio').then(({ audioEngine }) => {
            audioEngine.stopTrack('music');
          });
        }
        if (state.activeAmbienceId === id) {
          set({ activeAmbienceId: null });
          import('@/platform/audio').then(({ audioEngine }) => {
            audioEngine.stopTrack('ambience');
          });
        }
        
        await audioDatabase.removeTrack(id);
        const tracks = await audioDatabase.getTracks();
        set({ crateTracks: tracks });
      }
    }),
    {
      name: 'synapse-focus-audio',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences, not transient state
      partialize: (state) => ({
        volume: state.volume,
        mix: state.mix,
        activeMusicId: state.activeMusicId,
        activeAmbienceId: state.activeAmbienceId,
        synesthesiaEnabled: state.synesthesiaEnabled,
        autoDuckEnabled: state.autoDuckEnabled,
        ttsEnabled: state.ttsEnabled,
        ttsRate: state.ttsRate,
        // Note: playIntent is NOT persisted - audio should not auto-play on reload
      }),
    }
  )
);
