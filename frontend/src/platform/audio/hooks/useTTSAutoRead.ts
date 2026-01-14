/**
 * useTTSAutoRead - Auto-read AI Chat Responses
 *
 * Monitors streaming state and speaks content when complete.
 * Respects context permissions and user preferences.
 */

import { useEffect, useRef } from 'react';
import { ttsClient, audioContextResolver } from '@/platform/audio';

interface UseTTSAutoReadOptions {
  /** Is TTS enabled by user? */
  enabled: boolean;
  /** Content to speak when streaming completes */
  content: string;
  /** Is currently streaming? */
  isStreaming: boolean;
}

/**
 * Hook that auto-reads content when streaming completes.
 * 
 * @example
 * useTTSAutoRead({
 *   enabled: userSettings.ttsEnabled,
 *   content: streamingContent,
 *   isStreaming,
 * });
 */
export function useTTSAutoRead({
  enabled,
  content,
  isStreaming,
}: UseTTSAutoReadOptions): void {
  const wasStreamingRef = useRef(false);
  const lastContentRef = useRef('');

  useEffect(() => {
    // Detect stream completion: was streaming → now not streaming
    const streamJustCompleted = wasStreamingRef.current && !isStreaming;
    const hasNewContent = content !== lastContentRef.current && content.length > 0;

    if (streamJustCompleted && hasNewContent) {
      // Check if TTS is allowed
      if (enabled && audioContextResolver.allows('tts')) {
        console.debug('[useTTSAutoRead] Speaking AI response');
        ttsClient.speak(content, { context: 'chat', interrupt: true });
      }
    }

    // Update refs
    wasStreamingRef.current = isStreaming;
    if (!isStreaming) {
      lastContentRef.current = content;
    }
  }, [isStreaming, content, enabled]);
}

export default useTTSAutoRead;
