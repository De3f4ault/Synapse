/**
 * useLiveVoice - Hook for real-time voice interaction with Gemini Live API
 *
 * Handles:
 * - WebSocket connection to /ws/live
 * - Audio recording with AudioWorklet (16kHz PCM)
 * - Audio playback (24kHz PCM)
 * - State management
 * - Transcription streaming
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getAuthToken } from "@/api/client";
import { WS_BASE_URL } from "@/lib/constants";

// Types
export type LiveVoiceState =
    | "idle"
    | "connecting"
    | "connected"
    | "listening"
    | "speaking"
    | "error";

export interface LiveVoiceMessage {
    type: string;
    data?: string;
    content?: string;
    text?: string;
    metadata?: Record<string, unknown>;
}

export interface UseLiveVoiceOptions {
    onTranscript?: (text: string, isFinal: boolean, isInput: boolean) => void;
    onGrounding?: (metadata: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    onStateChange?: (state: LiveVoiceState) => void;
    systemInstruction?: string;
    enableSearch?: boolean;
}

export interface UseLiveVoiceReturn {
    state: LiveVoiceState;
    isActive: boolean;
    startSession: () => Promise<void>;
    endSession: () => void;
    sendText: (text: string) => void;
    interrupt: () => void;
    inputTranscript: string;
    outputTranscript: string;
    audioLevel: number;
    analyserNode: AnalyserNode | null;
}

// Audio constants
const SAMPLE_RATE_OUT = 24000;

/**
 * AudioWorklet processor code for downsampling to 16kHz
 */
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
      
      // Downsample from 48kHz to 16kHz (take every 3rd sample)
      for (let i = 0; i < samples.length; i += 3) {
        // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
        const sample = Math.max(-1, Math.min(1, samples[i]));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        this.buffer.push(int16);
      }
      
      // Send chunks when buffer is large enough
      if (this.buffer.length >= 1024) {
        const chunk = this.buffer.splice(0, 1024);
        this.port.postMessage({ pcm: new Int16Array(chunk) });
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

export function useLiveVoice(options: UseLiveVoiceOptions = {}): UseLiveVoiceReturn {
    const {
        onTranscript,
        onGrounding,
        onError,
        onStateChange,
        systemInstruction,
        enableSearch = true,
    } = options;

    // State
    const [state, setState] = useState<LiveVoiceState>("idle");
    const [inputTranscript, setInputTranscript] = useState("");
    const [outputTranscript, setOutputTranscript] = useState("");
    const [audioLevel, setAudioLevel] = useState(0);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isStartingRef = useRef(false); // Prevents cleanup during initialization

    // Update state helper
    const updateState = useCallback(
        (newState: LiveVoiceState) => {
            setState(newState);
            onStateChange?.(newState);
        },
        [onStateChange]
    );

    // Base64 to ArrayBuffer
    const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        return btoa(binary);
    };

    // Int16Array to ArrayBuffer (for PCM data)
    const int16ToArrayBuffer = (int16Array: Int16Array): ArrayBuffer => {
        return int16Array.buffer.slice(0) as ArrayBuffer;
    };

    // Play audio from queue
    const playAudioQueue = useCallback(async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        if (!audioContextRef.current) return;

        isPlayingRef.current = true;
        updateState("speaking");

        while (audioQueueRef.current.length > 0) {
            const pcmData = audioQueueRef.current.shift();
            if (!pcmData) continue;

            try {
                // Convert PCM 16-bit to Float32
                const int16View = new Int16Array(pcmData);
                const float32 = new Float32Array(int16View.length);
                for (let i = 0; i < int16View.length; i++) {
                    float32[i] = (int16View[i] ?? 0) / 32768;
                }

                // Create audio buffer
                const audioBuffer = audioContextRef.current.createBuffer(
                    1,
                    float32.length,
                    SAMPLE_RATE_OUT
                );
                audioBuffer.copyToChannel(float32, 0);

                // Play
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.start();

                // Wait for playback to complete
                await new Promise<void>((resolve) => {
                    source.onended = () => resolve();
                });
            } catch (error) {
                console.error("[LiveVoice] Audio playback error:", error);
            }
        }

        isPlayingRef.current = false;
        updateState("listening");
    }, [updateState]);

    // Handle WebSocket messages
    const handleMessage = useCallback(
        (event: MessageEvent) => {
            try {
                const message: LiveVoiceMessage = JSON.parse(event.data);

                switch (message.type) {
                    case "connected":
                        console.log("[LiveVoice] Session connected:", message.data);
                        updateState("listening");
                        break;

                    case "audio":
                        if (message.data) {
                            const audioData = base64ToArrayBuffer(message.data);
                            audioQueueRef.current.push(audioData);
                            playAudioQueue();
                        }
                        break;

                    case "input_transcript":
                        if (message.text) {
                            setInputTranscript(message.text);
                            onTranscript?.(message.text, true, true);
                        }
                        break;

                    case "output_transcript":
                        if (message.text) {
                            setOutputTranscript((prev) => prev + message.text);
                            onTranscript?.(message.text, false, false);
                        }
                        break;

                    case "grounding":
                        if (message.metadata) {
                            onGrounding?.(message.metadata);
                        }
                        break;

                    case "interrupted":
                        console.log("[LiveVoice] Interrupted");
                        // Clear audio queue on interruption
                        audioQueueRef.current = [];
                        isPlayingRef.current = false;
                        updateState("listening");
                        break;

                    case "turn_complete":
                        console.log("[LiveVoice] Turn complete");
                        setOutputTranscript("");
                        break;

                    case "error":
                        console.error("[LiveVoice] Error:", message);
                        onError?.(message.content || "Unknown error");
                        updateState("error");
                        break;
                }
            } catch (error) {
                console.error("[LiveVoice] Message parse error:", error);
            }
        },
        [onTranscript, onGrounding, onError, playAudioQueue, updateState]
    );

    // Update audio level for visualization
    const updateAudioLevel = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }, []);

    // Start voice session
    const startSession = useCallback(async () => {
        if (state !== "idle" && state !== "error") return;
        if (isStartingRef.current) return; // Prevent double starts

        isStartingRef.current = true;

        try {
            updateState("connecting");

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                throw new Error("Not authenticated");
            }

            // Create AudioContext
            audioContextRef.current = new AudioContext({ sampleRate: 48000 });

            // Create AudioWorklet blob URL
            const workletBlob = new Blob([AUDIO_WORKLET_CODE], {
                type: "application/javascript",
            });
            const workletUrl = URL.createObjectURL(workletBlob);

            // Load AudioWorklet module
            await audioContextRef.current.audioWorklet.addModule(workletUrl);
            URL.revokeObjectURL(workletUrl);

            // Get microphone
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 48000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            // Verify AudioContext is still valid after async operation
            if (!audioContextRef.current) {
                throw new Error("AudioContext was closed during setup");
            }

            // Create source and worklet node
            const source = audioContextRef.current.createMediaStreamSource(
                mediaStreamRef.current
            );
            workletNodeRef.current = new AudioWorkletNode(
                audioContextRef.current,
                "pcm-processor"
            );

            // Create analyser for level visualization
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            // Connect audio pipeline
            source.connect(workletNodeRef.current);

            // Connect to WebSocket
            const wsUrl = `${WS_BASE_URL}/ws/live?token=${token}`;
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log("[LiveVoice] WebSocket connected");

                // Send initial config
                wsRef.current?.send(
                    JSON.stringify({
                        system_instruction: systemInstruction,
                        enable_search: enableSearch,
                    })
                );
            };

            wsRef.current.onmessage = handleMessage;

            wsRef.current.onerror = (error) => {
                console.error("[LiveVoice] WebSocket error:", error);
                onError?.("Connection error");
                updateState("error");
            };

            wsRef.current.onclose = () => {
                console.log("[LiveVoice] WebSocket closed");
                if (state !== "idle") {
                    updateState("idle");
                }
            };

            // Handle PCM data from worklet
            workletNodeRef.current.port.onmessage = (event) => {
                if (event.data.pcm && wsRef.current?.readyState === WebSocket.OPEN) {
                    const pcmBuffer = int16ToArrayBuffer(event.data.pcm);
                    const base64 = arrayBufferToBase64(pcmBuffer);
                    wsRef.current.send(JSON.stringify({ type: "audio", data: base64 }));
                }
            };

            // Start level monitoring
            updateAudioLevel();

            // Startup complete
            isStartingRef.current = false;
        } catch (error) {
            console.error("[LiveVoice] Start error:", error);
            onError?.(error instanceof Error ? error.message : "Failed to start");
            updateState("error");
            isStartingRef.current = false;
        }
    }, [
        state,
        handleMessage,
        onError,
        systemInstruction,
        enableSearch,
        updateState,
        updateAudioLevel,
    ]);

    // End session
    const endSession = useCallback(() => {
        // Don't clean up if we're in the middle of starting
        if (isStartingRef.current) {
            console.log("[LiveVoice] Skipping cleanup during startup");
            return;
        }

        console.log("[LiveVoice] Ending session");

        // Stop animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: "end_session" }));
            wsRef.current.close();
            wsRef.current = null;
        }

        // Stop audio worklet
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
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

        // Clear refs
        analyserRef.current = null;
        audioQueueRef.current = [];
        isPlayingRef.current = false;

        // Reset state
        setInputTranscript("");
        setOutputTranscript("");
        setAudioLevel(0);
        updateState("idle");
    }, [updateState]);

    // Send text message
    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "text", content: text }));
        }
    }, []);

    // Interrupt AI
    const interrupt = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "interrupt" }));
            // Clear local audio queue
            audioQueueRef.current = [];
            isPlayingRef.current = false;
        }
    }, []);

    // Store endSession in a ref to avoid re-running cleanup on every change
    const endSessionRef = useRef(endSession);
    endSessionRef.current = endSession;

    // Cleanup on unmount ONLY (empty deps)
    useEffect(() => {
        return () => {
            endSessionRef.current();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        state,
        isActive: state !== "idle" && state !== "error",
        startSession,
        endSession,
        sendText,
        interrupt,
        inputTranscript,
        outputTranscript,
        audioLevel,
        analyserNode: analyserRef.current,
    };
}
