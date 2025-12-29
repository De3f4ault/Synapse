/**
 * Voice Store - Single Source of Truth for Voice Mode State
 *
 * INVARIANT:
 * Voice is a MODE, not a feature.
 * When voiceState !== 'idle':
 * - Text input becomes a projection (read-only)
 * - Voice controller owns the session lifecycle
 * - No component sends messages directly
 *
 * Voice controller emits events → this store reacts → UI renders.
 *
 * INVARIANT:
 * This store is the single authority for this domain.
 * UI and hooks must never derive parallel state.
 *
 * CONTRACT: Session Boundary
 * `resetForSession` MUST be idempotent (safe to call multiple times with same sessionId).
 */

import { create } from 'zustand';
import {
    VoiceState,
    TranscriptEntry,
    VoiceGroundingSource,
} from '../engine/types';

interface VoiceStoreState {
    // Session state
    state: VoiceState;

    // Transcripts
    inputTranscript: string;   // Current in-progress user speech
    outputTranscript: string;  // Current in-progress AI speech
    transcriptHistory: TranscriptEntry[];

    // Audio levels (0-1)
    inputAudioLevel: number;
    outputAudioLevel: number;

    // Grounding sources from search
    groundingSources: VoiceGroundingSource[];

    // Error state
    error: string | null;

    // Session tracking
    currentSessionId: number | null;

    // Actions - State transitions
    setState: (state: VoiceState) => void;
    setError: (error: string | null) => void;

    // Actions - Transcripts
    setInputTranscript: (text: string) => void;
    setOutputTranscript: (text: string) => void;
    appendInputTranscript: (text: string) => void;
    appendOutputTranscript: (text: string) => void;
    commitTranscript: (entry: TranscriptEntry) => void;
    clearTranscripts: () => void;

    // Actions - Audio levels
    setInputAudioLevel: (level: number) => void;
    setOutputAudioLevel: (level: number) => void;

    // Actions - Grounding
    setGroundingSources: (sources: VoiceGroundingSource[]) => void;

    // Actions - Lifecycle
    startSession: () => void;
    endSession: () => void;
    reset: () => void;

    // Session boundary (Contract #1)
    resetForSession: (sessionId: number) => void;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => ({
    // Initial state
    state: 'idle',
    inputTranscript: '',
    outputTranscript: '',
    transcriptHistory: [],
    inputAudioLevel: 0,
    outputAudioLevel: 0,
    groundingSources: [],
    error: null,
    currentSessionId: null,

    // State transitions
    setState: (state) => set({ state, error: state === 'error' ? 'Connection error' : null }),
    setError: (error) => set({ error, state: error ? 'error' : 'idle' }),

    // Transcripts
    setInputTranscript: (inputTranscript) => set({ inputTranscript }),
    setOutputTranscript: (outputTranscript) => set({ outputTranscript }),
    appendInputTranscript: (text) =>
        set((s) => ({ inputTranscript: s.inputTranscript + text })),
    appendOutputTranscript: (text) =>
        set((s) => ({ outputTranscript: s.outputTranscript + text })),
    commitTranscript: (entry) =>
        set((s) => ({
            transcriptHistory: [...s.transcriptHistory, entry],
            inputTranscript: entry.isInput ? '' : s.inputTranscript,
            outputTranscript: entry.isInput ? s.outputTranscript : '',
        })),
    clearTranscripts: () =>
        set({ inputTranscript: '', outputTranscript: '', transcriptHistory: [] }),

    // Audio levels
    setInputAudioLevel: (inputAudioLevel) => set({ inputAudioLevel }),
    setOutputAudioLevel: (outputAudioLevel) => set({ outputAudioLevel }),

    // Grounding
    setGroundingSources: (groundingSources) => set({ groundingSources }),

    // Lifecycle
    startSession: () =>
        set({
            state: 'connecting',
            error: null,
            inputTranscript: '',
            outputTranscript: '',
            groundingSources: [],
        }),
    endSession: () =>
        set({
            state: 'idle',
            inputTranscript: '',
            outputTranscript: '',
            inputAudioLevel: 0,
            outputAudioLevel: 0,
        }),
    reset: () =>
        set({
            state: 'idle',
            inputTranscript: '',
            outputTranscript: '',
            transcriptHistory: [],
            inputAudioLevel: 0,
            outputAudioLevel: 0,
            groundingSources: [],
            error: null,
            currentSessionId: null,
        }),

    // Session boundary - idempotent reset for session change
    resetForSession: (sessionId) => {
        const state = get();
        // Idempotent: skip if same session
        if (state.currentSessionId === sessionId) {
            return;
        }
        // If voice is active, terminate it
        if (state.state !== 'idle') {
            set({ state: 'idle' });
        }
        set({
            inputTranscript: '',
            outputTranscript: '',
            transcriptHistory: [],
            inputAudioLevel: 0,
            outputAudioLevel: 0,
            groundingSources: [],
            error: null,
            currentSessionId: sessionId,
        });
    },
}));

