/**
 * Voice Module - Public API
 *
 * INVARIANT:
 * Voice is a MODE, not a feature.
 * When voice.state !== 'idle', text input is a projection, not a controller.
 *
 * This is the ONLY entry point for the voice module.
 * No deep imports across modules allowed.
 */

// Components
export { LiveVoiceOverlay, AudioVisualizer } from './components';

// Hooks
export { useLiveVoice } from './hooks';

// State (selectors only - store internals are private)
export { useVoiceStore } from './state/voiceStore';
export {
    useVoiceState,
    useIsVoiceActive,
    useIsListening,
    useIsSpeaking,
    useInputTranscript,
    useOutputTranscript,
    useTranscriptHistory,
    useInputAudioLevel,
    useOutputAudioLevel,
    useGroundingSources,
    useVoiceError,
    useVoiceActions,
} from './state/voiceSelectors';

// Engine types (for external typing only)
export type {
    VoiceState,
    TranscriptEntry,
    VoiceGroundingSource,
    VoiceConfig,
    VoiceEventType,
    VoiceEvent,
} from './engine/types';
