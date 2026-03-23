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
 *
 * Audio Architecture (modeled on Google's live-api-web-console reference):
 * - Input:  16kHz AudioContext → PCM worklet → base64 → WebSocket → Gemini
 * - Output: Gemini → WebSocket → PCM16 decode → scheduled playback via 24kHz AudioContext
 * - Two separate AudioContexts prevent sample-rate conflicts
 * - Scheduled playback with lookahead eliminates inter-chunk gaps (clicks/pops)
 *
 * STABILITY INVARIANT:
 * All public functions (startSession, endSession, interrupt, sendText) use [] deps
 * and access mutable state through refs. This prevents render loops when used in
 * useEffect dependencies or passed to child components.
 */

import { useRef, useCallback, useEffect } from 'react';
import { getAuthToken } from '@/api/client';
import { WS_BASE_URL } from '@/lib/constants';
import { useVoiceStore } from '../state/voiceStore';
import {
    useVoiceState,
    useIsVoiceActive,
    useInputTranscript,
    useOutputTranscript,
    useInputAudioLevel,
    useTranscriptHistory,
} from '../state/voiceSelectors';

// ==================== TYPES ====================

export interface UseLiveVoiceOptions {
    sessionId?: number;
    onTranscript?: (text: string, isFinal: boolean, isInput: boolean) => void;
    onGrounding?: (metadata: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    onStateChange?: (state: string) => void;
    onMessagesSaved?: (messageIds: number[]) => void;
    systemInstruction?: string;
    enableSearch?: boolean;
}

// ==================== AUDIO CONSTANTS ====================

/** Gemini expects 16kHz PCM input */
const SAMPLE_RATE_IN = 16000;
/** Gemini outputs 24kHz PCM */
const SAMPLE_RATE_OUT = 24000;
/** Buffer size for chunking output audio (matches Google's reference: 7680 samples = 320ms at 24kHz) */
const PLAYBACK_BUFFER_SIZE = 7680;
/** Schedule audio this far ahead to prevent gaps (200ms) */
const SCHEDULE_AHEAD_TIME = 0.2;
/** Initial buffer before first playback (100ms) */
const INITIAL_BUFFER_TIME = 0.1;
/** Poll interval for checking new audio in queue (ms) */
const QUEUE_POLL_INTERVAL = 100;

// ==================== AUDIO WORKLET ====================

const AUDIO_WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.bufferWriteIndex = 0;
  }

  sendAndClearBuffer() {
    this.port.postMessage({
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
      },
    });
    this.bufferWriteIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const channel0 = input[0];
      for (let i = 0; i < channel0.length; i++) {
        this.buffer[this.bufferWriteIndex++] = channel0[i] * 32768;
        if (this.bufferWriteIndex >= this.buffer.length) {
          this.sendAndClearBuffer();
        }
      }
      if (this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

// ==================== HOOK ====================

export function useLiveVoice(options: UseLiveVoiceOptions = {}) {

    // ---- Stable refs for options (so callbacks can have [] deps) ----
    const optionsRef = useRef(options);
    optionsRef.current = options;

    // Subscriptions (fine-grained from selectors)
    const state = useVoiceState();
    const isActive = useIsVoiceActive();
    const inputTranscript = useInputTranscript();
    const outputTranscript = useOutputTranscript();
    const audioLevel = useInputAudioLevel();
    const transcriptHistory = useTranscriptHistory();

    // ---- Refs for audio/WebSocket (mutable, no-render) ----
    const wsRef = useRef<WebSocket | null>(null);
    const inputContextRef = useRef<AudioContext | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const playbackGainRef = useRef<GainNode | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Scheduled playback state
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);
    const scheduledTimeRef = useRef(0);
    const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Guard: prevents ws.onclose from re-triggering store.endSession()
    // after an intentional close via endSession()
    const closingRef = useRef(false);

    // ==================== AUDIO LEVEL MONITORING ====================

    const updateAudioLevel = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);

        // Access store directly, not through component state
        useVoiceStore.getState().setInputAudioLevel(normalized);
    }, []);

    // ==================== AUDIO PLAYBACK (Scheduled) ====================

    const queueAudioForPlayback = useCallback((audioData: Uint8Array) => {
        const dataView = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength);
        const float32Array = new Float32Array(audioData.length / 2);
        for (let i = 0; i < audioData.length / 2; i++) {
            const int16 = dataView.getInt16(i * 2, true);
            float32Array[i] = int16 / 32768;
        }

        let offset = 0;
        while (offset < float32Array.length) {
            const end = Math.min(offset + PLAYBACK_BUFFER_SIZE, float32Array.length);
            audioQueueRef.current.push(float32Array.slice(offset, end));
            offset = end;
        }

        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            const ctx = playbackContextRef.current;
            if (ctx) {
                scheduledTimeRef.current = ctx.currentTime + INITIAL_BUFFER_TIME;
            }
            scheduleNextBuffer();
        }
    }, []);

    const scheduleNextBuffer = useCallback(() => {
        const ctx = playbackContextRef.current;
        const gainNode = playbackGainRef.current;
        if (!ctx || !gainNode) return;

        while (
            audioQueueRef.current.length > 0 &&
            scheduledTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME
        ) {
            const audioData = audioQueueRef.current.shift()!;
            const audioBuffer = ctx.createBuffer(1, audioData.length, SAMPLE_RATE_OUT);
            audioBuffer.getChannelData(0).set(audioData);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);

            const startTime = Math.max(scheduledTimeRef.current, ctx.currentTime);
            source.start(startTime);
            scheduledTimeRef.current = startTime + audioBuffer.duration;
        }

        if (audioQueueRef.current.length === 0) {
            if (!checkIntervalRef.current) {
                checkIntervalRef.current = setInterval(() => {
                    if (audioQueueRef.current.length > 0) {
                        scheduleNextBuffer();
                    }
                }, QUEUE_POLL_INTERVAL);
            }
        } else {
            const nextCheckTime =
                (scheduledTimeRef.current - ctx.currentTime) * 1000;
            setTimeout(
                () => scheduleNextBuffer(),
                Math.max(0, nextCheckTime - 50)
            );
        }
    }, []);

    const stopPlayback = useCallback(() => {
        const ctx = playbackContextRef.current;
        const gainNode = playbackGainRef.current;

        audioQueueRef.current = [];
        isPlayingRef.current = false;
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }

        if (ctx && gainNode) {
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            scheduledTimeRef.current = ctx.currentTime;

            setTimeout(() => {
                if (playbackContextRef.current && playbackGainRef.current) {
                    playbackGainRef.current.disconnect();
                    const newGain = playbackContextRef.current.createGain();
                    newGain.connect(playbackContextRef.current.destination);
                    playbackGainRef.current = newGain;
                }
            }, 200);
        }
    }, []);

    // ==================== MESSAGE HANDLER ====================
    // Uses useVoiceStore.getState() instead of component-level store
    // so the callback has [] deps and doesn't trigger re-renders.

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const msgType = data.type;
                const store = useVoiceStore.getState();
                const opts = optionsRef.current;

                switch (msgType) {
                    case 'input_transcript':
                        // ECHO PREVENTION: During 'speaking' state, the mic picks up
                        // the AI's audio from the speakers. Gemini transcribes this echo
                        // as 'input_transcription', polluting the user's transcript bubble.
                        // Only accumulate input transcripts when actually listening.
                        if (store.state !== 'speaking') {
                            store.appendInputTranscript(data.text || '');
                            opts.onTranscript?.(data.text || '', false, true);
                        }
                        break;

                    case 'output_transcript':
                        store.appendOutputTranscript(data.text || '');
                        opts.onTranscript?.(data.text || '', false, false);
                        break;

                    case 'audio':
                        if (data.data) {
                            // On first audio chunk of a new AI turn, commit the user's
                            // input transcript and clear it for a fresh display.
                            if (store.state !== 'speaking') {
                                const currentInput = store.inputTranscript;
                                if (currentInput) {
                                    store.commitTranscript({
                                        id: `input-${Date.now()}`,
                                        text: currentInput,
                                        isInput: true,
                                        isFinal: true,
                                        timestamp: Date.now(),
                                    });
                                }
                                // Clear input transcript display (AI's turn now)
                                store.setInputTranscript('');
                            }

                            const audioData = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
                            queueAudioForPlayback(audioData);
                            store.setState('speaking');
                        }
                        break;

                    case 'grounding':
                        store.setGroundingSources(data.sources || []);
                        opts.onGrounding?.(data.metadata || {});
                        break;

                    case 'turn_complete': {
                        // Reset playback state so mic unmutes for next user turn
                        isPlayingRef.current = false;
                        if (checkIntervalRef.current) {
                            clearInterval(checkIntervalRef.current);
                            checkIntervalRef.current = null;
                        }

                        // Commit final output transcript
                        const currentOutput = store.outputTranscript;
                        if (currentOutput) {
                            store.commitTranscript({
                                id: `output-${Date.now()}`,
                                text: currentOutput,
                                isInput: false,
                                isFinal: true,
                                timestamp: Date.now(),
                            });
                        }

                        // Clear both transcript displays for the next exchange
                        store.setInputTranscript('');
                        store.setOutputTranscript('');

                        store.setState('listening');
                        break;
                    }

                    case 'interrupted':
                        stopPlayback();
                        store.setState('listening');
                        break;

                    case 'messages_saved':
                        // Backend saved the turn to the database — notify caller
                        // so it can invalidate React Query message cache
                        opts.onMessagesSaved?.(data.message_ids || []);
                        break;

                    case 'error':
                        store.setError(data.message || 'Unknown error');
                        opts.onError?.(data.message || 'Unknown error');
                        break;
                }
            } catch (err) {
                console.error('[Voice] Failed to parse message:', err);
            }
        },
        [] // STABLE: accesses store via getState(), options via ref
    );

    // ==================== SESSION CONTROL ====================
    // ALL session functions have [] deps for stability.
    // They access mutable state through refs and useVoiceStore.getState().

    const startSession = useCallback(async () => {
        console.log('[Voice] Starting session...');
        const store = useVoiceStore.getState();
        const opts = optionsRef.current;

        closingRef.current = false;  // Reset closing guard
        store.startSession();
        opts.onStateChange?.('connecting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            mediaStreamRef.current = stream;

            // ---- INPUT: 16kHz AudioContext for mic capture ----
            const inputContext = new AudioContext({ sampleRate: SAMPLE_RATE_IN });
            inputContextRef.current = inputContext;

            const analyser = inputContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const micSource = inputContext.createMediaStreamSource(stream);
            micSource.connect(analyser);

            const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            await inputContext.audioWorklet.addModule(workletUrl);
            URL.revokeObjectURL(workletUrl);

            const workletNode = new AudioWorkletNode(inputContext, 'pcm-processor');
            workletNodeRef.current = workletNode;
            micSource.connect(workletNode);

            workletNode.port.onmessage = (e) => {
                // ECHO PREVENTION: Don't send mic audio while AI is playing back.
                // The mic captures the AI's speech from speakers, and Gemini interprets
                // this echo as user speech — causing self-interruptions (pausing) and
                // false input transcriptions (transcript mixing).
                if (wsRef.current?.readyState === WebSocket.OPEN && !isPlayingRef.current) {
                    const arrayBuffer = e.data?.data?.int16arrayBuffer;
                    if (arrayBuffer) {
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = '';
                        for (let i = 0; i < bytes.length; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = btoa(binary);
                        wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
                    }
                }
            };

            // ---- OUTPUT: 24kHz AudioContext for Gemini playback ----
            const playbackContext = new AudioContext({ sampleRate: SAMPLE_RATE_OUT });
            playbackContextRef.current = playbackContext;

            const gainNode = playbackContext.createGain();
            gainNode.connect(playbackContext.destination);
            playbackGainRef.current = gainNode;

            // Connect WebSocket — include session_id for session binding
            const token = getAuthToken();
            const sessionId = optionsRef.current.sessionId;
            const wsUrl = `${WS_BASE_URL}/ws/live?token=${token}${sessionId ? `&session_id=${sessionId}` : ''}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[Voice] WebSocket connected');
                const s = useVoiceStore.getState();
                const o = optionsRef.current;
                s.setState('listening');
                o.onStateChange?.('listening');

                ws.send(
                    JSON.stringify({
                        type: 'config',
                        system_instruction: optionsRef.current.systemInstruction,
                        enable_search: optionsRef.current.enableSearch ?? true,
                    })
                );
            };

            ws.onmessage = handleMessage;

            ws.onerror = (err) => {
                console.error('[Voice] WebSocket error:', err);
                const s = useVoiceStore.getState();
                const o = optionsRef.current;
                s.setError('Connection error');
                o.onError?.('Connection error');
            };

            ws.onclose = () => {
                console.log('[Voice] WebSocket closed');
                // Only reset store if this was NOT an intentional close via endSession().
                // endSession() already handles store.endSession() synchronously.
                if (!closingRef.current) {
                    const s = useVoiceStore.getState();
                    const o = optionsRef.current;
                    s.endSession();
                    o.onStateChange?.('idle');
                }
            };

            // Start audio level monitoring — store in ref for cleanup
            levelIntervalRef.current = setInterval(updateAudioLevel, 50);
        } catch (err) {
            console.error('[Voice] Failed to start session:', err);
            const s = useVoiceStore.getState();
            const o = optionsRef.current;
            s.setError('Failed to access microphone');
            o.onError?.('Failed to access microphone');
        }
    }, []); // STABLE: no deps, accesses everything through refs + getState()

    const endSession = useCallback(() => {
        // Idempotency guard — prevent the infinite loop
        if (!wsRef.current && !mediaStreamRef.current && !inputContextRef.current && !playbackContextRef.current) {
            return; // Already cleaned up, nothing to do
        }

        console.log('[Voice] Ending session...');
        closingRef.current = true;  // Prevent ws.onclose from re-triggering

        // Stop playback gracefully
        stopPlayback();

        // Clear audio level monitoring interval
        if (levelIntervalRef.current) {
            clearInterval(levelIntervalRef.current);
            levelIntervalRef.current = null;
        }

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

        // Close input audio context
        if (inputContextRef.current) {
            inputContextRef.current.close();
            inputContextRef.current = null;
        }

        // Close playback audio context
        if (playbackContextRef.current) {
            playbackContextRef.current.close();
            playbackContextRef.current = null;
        }

        workletNodeRef.current = null;
        analyserRef.current = null;
        playbackGainRef.current = null;

        useVoiceStore.getState().endSession();
        optionsRef.current.onStateChange?.('idle');
    }, []); // STABLE: no deps, accesses everything through refs + getState()

    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'text', content: text }));
        }
    }, []);

    const interrupt = useCallback(() => {
        stopPlayback();
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
        }
        useVoiceStore.getState().setState('listening');
    }, []); // STABLE: no deps

    // ==================== CLEANUP ====================
    // endSession is now STABLE ([] deps) so this useEffect cleanup
    // is safe — it only fires on actual component unmount, never on re-renders.
    useEffect(() => {
        return () => {
            console.log('[Voice] Component unmounting — forcing cleanup');
            endSession();
        };
    }, [endSession]); // endSession has [] deps, so this is equivalent to []

    // ==================== RETURN ====================

    return {
        // State (from store)
        state,
        isActive,
        inputTranscript,
        outputTranscript,
        audioLevel,
        transcriptHistory,

        // Methods (all stable references)
        startSession,
        endSession,
        sendText,
        interrupt,

        // For audio visualizer
        analyserNode: analyserRef.current,
    };
}

export default useLiveVoice;
