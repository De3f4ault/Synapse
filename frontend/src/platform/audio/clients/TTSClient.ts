/**
 * TTSClient - Text-to-Speech Audio Client
 *
 * Policy-first, command-driven TTS client.
 * Integrates with SoundPolicy for proper ducking coordination.
 *
 * ## Design Principles
 * - BORING: Accepts commands, never infers intent
 * - OBEDIENT: Respects SoundPolicy ducking decisions
 * - STATELESS: No queue, no batching, no memory
 *
 * ## Client Lifecycle
 * - Registers ONCE at construction (kind: 'speech', priority 90)
 * - speak() creates a speech session
 * - stop() immediately halts speech
 * - Music auto-ducks while speaking
 */

import { soundPolicy } from '../policy/SoundPolicy';
import type { AudioSource } from '../policy/types';

// TTS has higher priority than music (10), lower than alerts (100)
const TTS_SOURCE: AudioSource = {
  id: 'tts',
  priority: 90,
  duckable: false,    // TTS should not be ducked by music
  ducksOthers: true,  // TTS ducks music
  kind: 'speech',
};

export type TTSContext = 'chat' | 'study' | 'notification' | 'general';

export interface TTSOptions {
  /** Context for the speech (affects nothing yet, future use) */
  context?: TTSContext;
  /** If true, stop any current speech first */
  interrupt?: boolean;
  /** Speech rate (0.1 to 10, default 1) */
  rate?: number;
  /** Speech pitch (0 to 2, default 1) */
  pitch?: number;
}

type TTSState = 'idle' | 'speaking' | 'paused';

class TTSClient {
  private state: TTSState = 'idle';
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private synthesis: SpeechSynthesis | null = null;

  constructor() {
    // Register with SoundPolicy
    soundPolicy.registerSource(TTS_SOURCE);
    console.debug('[TTSClient] Registered with SoundPolicy');

    // Check for browser support
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('[TTSClient] Web Speech API not supported');
    }
  }

  get source(): AudioSource {
    return TTS_SOURCE;
  }

  /**
   * Check if TTS is available in this browser.
   */
  isAvailable(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Get current TTS state.
   */
  getState(): TTSState {
    return this.state;
  }

  /**
   * Check if currently speaking.
   */
  isSpeaking(): boolean {
    return this.state === 'speaking';
  }

  /**
   * Check if TTS is allowed in current context.
   */
  isAllowedInContext(): boolean {
    try {
      const { audioContextResolver } = require('../context/AudioContextResolver');
      return audioContextResolver.allows('tts');
    } catch {
      return true; // Default to allow if context not loaded
    }
  }

  /**
   * Get the current utterance (if any).
   */
  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  /**
   * Speak the given text.
   * Returns a promise that resolves when speech completes or is interrupted.
   */
  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('TTS not available'));
        return;
      }

      const { interrupt = true, rate = 1, pitch = 1 } = options;

      // Stop current speech if interrupt requested
      if (interrupt && this.state === 'speaking') {
        this.stop();
      }

      // Don't queue - if already speaking and no interrupt, reject
      if (this.state === 'speaking') {
        reject(new Error('Already speaking. Set interrupt: true to override.'));
        return;
      }

      // Check if TTS is allowed in current context (for auto-triggered speech)
      if (!this.isAllowedInContext()) {
        console.debug('[TTSClient] TTS suppressed by context');
        resolve(); // Silent no-op, not an error
        return;
      }

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.1, Math.min(10, rate));
      utterance.pitch = Math.max(0, Math.min(2, pitch));

      // Set up event handlers
      utterance.onstart = () => {
        this.state = 'speaking';
        this.currentUtterance = utterance;
        
        // Tell SoundPolicy we're active → triggers ducking
        soundPolicy.setActive(TTS_SOURCE.id, true);
        console.debug('[TTSClient] Speech started');
      };

      utterance.onend = () => {
        this.state = 'idle';
        this.currentUtterance = null;
        
        // Tell SoundPolicy we're done → releases ducking
        soundPolicy.setActive(TTS_SOURCE.id, false);
        console.debug('[TTSClient] Speech ended');
        resolve();
      };

      utterance.onerror = (event) => {
        this.state = 'idle';
        this.currentUtterance = null;
        soundPolicy.setActive(TTS_SOURCE.id, false);
        
        // 'interrupted' is not an error, it's expected on stop()
        if (event.error === 'interrupted') {
          resolve();
        } else {
          console.error('[TTSClient] Speech error:', event.error);
          reject(new Error(`TTS error: ${event.error}`));
        }
      };

      // Speak
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop any current speech immediately.
   */
  stop(): void {
    if (!this.synthesis) return;

    if (this.state === 'speaking') {
      this.synthesis.cancel();
      this.state = 'idle';
      this.currentUtterance = null;
      soundPolicy.setActive(TTS_SOURCE.id, false);
      console.debug('[TTSClient] Speech stopped');
    }
  }

  /**
   * Pause current speech (if supported).
   */
  pause(): void {
    if (!this.synthesis || this.state !== 'speaking') return;
    
    this.synthesis.pause();
    this.state = 'paused';
    console.debug('[TTSClient] Speech paused');
  }

  /**
   * Resume paused speech (if supported).
   */
  resume(): void {
    if (!this.synthesis || this.state !== 'paused') return;
    
    this.synthesis.resume();
    this.state = 'speaking';
    console.debug('[TTSClient] Speech resumed');
  }

  /**
   * Get available voices.
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }
}

// Singleton export
export const ttsClient = new TTSClient();
