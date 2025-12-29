/**
 * useLiveVoice - Thin Adapter Hook for Voice Mode
 *
 * INVARIANT:
 * Voice is a MODE, not a feature.
 * When active, text input becomes a projection.
 * This hook DOES NOT own state - it delegates to voiceStore.
 *
 * Responsibilities:
 * - Manage WebSocket connection to /ws/live
 * - Setup AudioContext, AudioWorklet, and media streams
 * - Route audio events to store actions
 * - Provide stable API for voice UI components
 */

import { useRef, useCallback } from 'react';
import { getAuthToken } from '@/api/client';
import { WS_BASE_URL } from '@/lib/constants';
import { useVoiceStore } from '../state/voiceStore';
import {
    useVoiceState,
    useIsVoiceActive,
    useInputTranscript,
    useOutputTranscript,
    useInputAudioLevel,
} from '../state/voiceSelectors';

// ==================== TYPES ====================

export interface UseLiveVoiceOptions {
    onTranscript?: (text: string, isFinal: boolean, isInput: boolean) => void;
    onGrounding?: (metadata: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    onStateChange?: (state: string) => void;
    systemInstruction?: string;
    enableSearch?: boolean;
}

// Audio constants
const SAMPLE_RATE_OUT = 24000;

// AudioWorklet processor code
const AUDIO_WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const samples = input[0];
      for (let i = 0; i < samples.length; i += 3) {
        const sample = Math.max(-1, Math.min(1, samples[i]));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        this.buffer.push(int16);
      }
      
      if (this.buffer.length >= 512) {
        const chunk = new Int16Array(this.buffer.splice(0, 512));
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

// ==================== HOOK ====================

export function useLiveVoice(options: UseLiveVoiceOptions = {}) {
    const {
        onTranscript,
        onGrounding,
        onError,
        onStateChange,
        systemInstruction,
        enableSearch = true,
    } = options;

    const store = useVoiceStore();

    // Subscriptions (fine-grained from selectors)
    const state = useVoiceState();
    const isActive = useIsVoiceActive();
    const inputTranscript = useInputTranscript();
    const outputTranscript = useOutputTranscript();
    const audioLevel = useInputAudioLevel();

    // Refs for audio/WebSocket (not in store - implementation detail)
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);

    // ==================== CALLBACKS ====================

    const updateAudioLevel = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);

        store.setInputAudioLevel(normalized);
    }, [store]);

    // ==================== MESSAGE HANDLER ====================

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const msgType = data.type;

                switch (msgType) {
                    case 'input_transcript':
                        store.setInputTranscript(data.text || '');
                        onTranscript?.(data.text || '', data.is_final || false, true);
                        if (data.is_final) {
                            store.commitTranscript({
                                id: `input-${Date.now()}`,
                                text: data.text || '',
                                isInput: true,
                                isFinal: true,
                                timestamp: Date.now(),
                            });
                        }
                        break;

                    case 'output_transcript':
                        store.setOutputTranscript(data.text || '');
                        onTranscript?.(data.text || '', data.is_final || false, false);
                        if (data.is_final) {
                            store.commitTranscript({
                                id: `output-${Date.now()}`,
                                text: data.text || '',
                                isInput: false,
                                isFinal: true,
                                timestamp: Date.now(),
                            });
                        }
                        break;

                    case 'audio':
                        if (data.data) {
                            const audioData = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
                            queueAudioForPlayback(audioData);
                            store.setState('speaking');
                        }
                        break;

                    case 'grounding':
                        store.setGroundingSources(data.sources || []);
                        onGrounding?.(data.metadata || {});
                        break;

                    case 'turn_complete':
                        store.setState('listening');
                        break;

                    case 'interrupted':
                        // Clear audio queue on interrupt
                        audioQueueRef.current = [];
                        store.setState('listening');
                        break;

                    case 'error':
                        store.setError(data.message || 'Unknown error');
                        onError?.(data.message || 'Unknown error');
                        break;
                }
            } catch (err) {
                console.error('[Voice] Failed to parse message:', err);
            }
        },
        [store, onTranscript, onGrounding, onError]
    );

    // ==================== AUDIO PLAYBACK ====================

    const queueAudioForPlayback = useCallback((audioData: Uint8Array) => {
        // Convert PCM16 to Float32
        const int16View = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.length / 2);
        const float32 = new Float32Array(int16View.length);
        for (let i = 0; i < int16View.length; i++) {
            const sample = int16View[i];
            float32[i] = sample !== undefined ? sample / 32768 : 0;
        }
        audioQueueRef.current.push(float32);

        if (!isPlayingRef.current) {
            playNextChunk();
        }
    }, []);

    const playNextChunk = useCallback(() => {
        if (!audioContextRef.current || audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            return;
        }

        isPlayingRef.current = true;
        const chunk = audioQueueRef.current.shift();
        if (!chunk) {
            isPlayingRef.current = false;
            return;
        }
        const buffer = audioContextRef.current.createBuffer(1, chunk.length, SAMPLE_RATE_OUT);
        const channelData = new Float32Array(chunk);
        buffer.copyToChannel(channelData, 0);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => playNextChunk();
        source.start();
    }, []);

    // ==================== SESSION CONTROL ====================

    const startSession = useCallback(async () => {
        console.log('[Voice] Starting session...');
        store.startSession();
        onStateChange?.('connecting');

        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 48000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            mediaStreamRef.current = stream;

            // Setup audio context
            const audioContext = new AudioContext({ sampleRate: 48000 });
            audioContextRef.current = audioContext;

            // Setup analyser for audio levels
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Setup AudioWorklet for PCM encoding
            const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            await audioContext.audioWorklet.addModule(workletUrl);

            const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
            workletNodeRef.current = workletNode;
            source.connect(workletNode);

            workletNode.port.onmessage = (e) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(e.data)));
                    wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
                }
            };

            // Connect WebSocket
            const token = getAuthToken();
            const wsUrl = `${WS_BASE_URL}/ws/live?token=${token}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[Voice] WebSocket connected');
                store.setState('listening');
                onStateChange?.('listening');

                // Send config
                ws.send(
                    JSON.stringify({
                        type: 'config',
                        system_instruction: systemInstruction,
                        enable_search: enableSearch,
                    })
                );
            };

            ws.onmessage = handleMessage;

            ws.onerror = (err) => {
                console.error('[Voice] WebSocket error:', err);
                store.setError('Connection error');
                onError?.('Connection error');
            };

            ws.onclose = () => {
                console.log('[Voice] WebSocket closed');
                store.endSession();
                onStateChange?.('idle');
            };

            // Start audio level monitoring
            const levelInterval = setInterval(updateAudioLevel, 50);

            // Store cleanup function for later
            wsRef.current.addEventListener('close', () => {
                clearInterval(levelInterval);
            });
        } catch (err) {
            console.error('[Voice] Failed to start session:', err);
            store.setError('Failed to access microphone');
            onError?.('Failed to access microphone');
        }
    }, [store, systemInstruction, enableSearch, handleMessage, onStateChange, onError, updateAudioLevel]);

    const endSession = useCallback(() => {
        console.log('[Voice] Ending session...');

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Stop media stream
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        workletNodeRef.current = null;
        analyserRef.current = null;
        audioQueueRef.current = [];
        isPlayingRef.current = false;

        store.endSession();
        onStateChange?.('idle');
    }, [store, onStateChange]);

    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'text', content: text }));
        }
    }, []);

    const interrupt = useCallback(() => {
        audioQueueRef.current = [];
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
        }
        store.setState('listening');
    }, [store]);

    // ==================== CLEANUP ====================
    // NOTE: Cleanup is handled imperatively via endSession() call,
    // not via useEffect cleanup which would cause infinite re-renders
    // due to endSession being recreated on each render.

    // ==================== RETURN ====================

    return {
        // State (from store)
        state,
        isActive,
        inputTranscript,
        outputTranscript,
        audioLevel,

        // Methods
        startSession,
        endSession,
        sendText,
        interrupt,

        // For audio visualizer
        analyserNode: analyserRef.current,
    };
}

export default useLiveVoice;
