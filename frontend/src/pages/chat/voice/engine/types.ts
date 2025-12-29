/**
 * Voice Engine Types
 *
 * INVARIANT:
 * Voice is a MODE, not a feature.
 * When voice.state !== 'idle', text input is a projection, not a controller.
 *
 * These types are pure data structures.
 * No React, no DOM, no side-effects.
 */

/**
 * Voice session states
 */
export type VoiceState =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'listening'
    | 'processing'
    | 'speaking'
    | 'error';

/**
 * Voice transcript entry
 */
export interface TranscriptEntry {
    id: string;
    text: string;
    isInput: boolean; // true = user spoke, false = AI spoke
    isFinal: boolean;
    timestamp: number;
}

/**
 * Grounding source from search
 */
export interface VoiceGroundingSource {
    title: string;
    url: string;
    snippet?: string;
}

/**
 * Voice session configuration
 */
export interface VoiceConfig {
    systemInstruction?: string;
    enableSearch?: boolean;
    voice?: string;
}

/**
 * Voice event types from WebSocket
 */
export type VoiceEventType =
    | 'connected'
    | 'input_transcript'
    | 'output_transcript'
    | 'grounding'
    | 'tool_call'
    | 'audio_data'
    | 'interrupted'
    | 'turn_complete'
    | 'error'
    | 'disconnected';

/**
 * Voice event payload
 */
export interface VoiceEvent {
    type: VoiceEventType;
    data?: unknown;
    timestamp: number;
}

/**
 * Initial voice state
 */
export const INITIAL_VOICE_STATE: {
    state: VoiceState;
    inputTranscript: string;
    outputTranscript: string;
    audioLevel: number;
} = {
    state: 'idle',
    inputTranscript: '',
    outputTranscript: '',
    audioLevel: 0,
};
