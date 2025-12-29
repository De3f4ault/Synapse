/**
 * Voice Selectors - Derived State
 *
 * Fine-grained subscriptions for optimal re-renders.
 */

import { useVoiceStore } from './voiceStore';

// State
export const useVoiceState = () => useVoiceStore((s) => s.state);
export const useIsVoiceActive = () => useVoiceStore((s) => s.state !== 'idle');
export const useIsListening = () => useVoiceStore((s) => s.state === 'listening');
export const useIsSpeaking = () => useVoiceStore((s) => s.state === 'speaking');

// Transcripts
export const useInputTranscript = () => useVoiceStore((s) => s.inputTranscript);
export const useOutputTranscript = () => useVoiceStore((s) => s.outputTranscript);
export const useTranscriptHistory = () => useVoiceStore((s) => s.transcriptHistory);

// Audio levels
export const useInputAudioLevel = () => useVoiceStore((s) => s.inputAudioLevel);
export const useOutputAudioLevel = () => useVoiceStore((s) => s.outputAudioLevel);

// Grounding
export const useGroundingSources = () => useVoiceStore((s) => s.groundingSources);

// Error
export const useVoiceError = () => useVoiceStore((s) => s.error);

// Actions (stable references)
export const useVoiceActions = () =>
    useVoiceStore((s) => ({
        setState: s.setState,
        setError: s.setError,
        setInputTranscript: s.setInputTranscript,
        setOutputTranscript: s.setOutputTranscript,
        appendInputTranscript: s.appendInputTranscript,
        appendOutputTranscript: s.appendOutputTranscript,
        commitTranscript: s.commitTranscript,
        setInputAudioLevel: s.setInputAudioLevel,
        setOutputAudioLevel: s.setOutputAudioLevel,
        setGroundingSources: s.setGroundingSources,
        startSession: s.startSession,
        endSession: s.endSession,
        reset: s.reset,
    }));
