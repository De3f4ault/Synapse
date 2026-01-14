/**
 * useTTS - React Hook for Text-to-Speech
 *
 * Provides a simple interface to the TTSClient for React components.
 * Automatically cleans up on unmount.
 *
 * ## Usage
 * ```tsx
 * const { speak, stop, isSpeaking } = useTTS();
 *
 * <button onClick={() => speak('Hello world')}>
 *   {isSpeaking ? 'Speaking...' : 'Speak'}
 * </button>
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { ttsClient, TTSOptions } from '../index';

interface UseTTSReturn {
  /** Speak the given text */
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  /** Stop any current speech */
  stop: () => void;
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Whether TTS is available in this browser */
  isAvailable: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isAvailable = ttsClient.isAvailable();

  // Sync state with ttsClient
  useEffect(() => {
    const interval = setInterval(() => {
      const speaking = ttsClient.isSpeaking();
      if (speaking !== isSpeaking) {
        setIsSpeaking(speaking);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (ttsClient.isSpeaking()) {
        ttsClient.stop();
      }
    };
  }, []);

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    setIsSpeaking(true);
    try {
      await ttsClient.speak(text, options);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    ttsClient.stop();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isAvailable,
  };
}
