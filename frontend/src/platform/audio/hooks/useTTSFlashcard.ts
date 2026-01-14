/**
 * useTTSFlashcard - Read Flashcard Answers Aloud
 *
 * Automatically speaks card answer when revealed.
 * Respects context permissions.
 */

import { useEffect, useRef } from 'react';
import { ttsClient, audioContextResolver } from '@/platform/audio';

interface UseTTSFlashcardOptions {
  /** The card being studied (null if no card) */
  cardId: number | null;
  /** Text to speak when revealed */
  answerText: string;
  /** Is the card currently flipped (showing answer)? */
  isFlipped: boolean;
  /** Is TTS enabled by user? */
  enabled?: boolean;
}

/**
 * Hook that reads flashcard answers when card is flipped to reveal.
 * 
 * @example
 * useTTSFlashcard({
 *   cardId: currentCard?.id ?? null,
 *   answerText: currentCard?.back_text ?? '',
 *   isFlipped,
 *   enabled: userSettings.ttsEnabled,
 * });
 */
export function useTTSFlashcard({
  cardId,
  answerText,
  isFlipped,
  enabled = true,
}: UseTTSFlashcardOptions): void {
  const previousFlipStateRef = useRef(false);
  const previousCardIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Detect flip-to-reveal: was not flipped → now flipped
    const justFlipped = !previousFlipStateRef.current && isFlipped;
    // Or new card that's already flipped
    const newCardFlipped = previousCardIdRef.current !== cardId && isFlipped;

    if ((justFlipped || newCardFlipped) && answerText) {
      // Check if TTS is allowed in current context
      if (enabled && audioContextResolver.allows('tts')) {
        console.debug('[useTTSFlashcard] Speaking card answer');
        ttsClient.speak(answerText, { context: 'study', interrupt: true });
      }
    }

    // Update refs
    previousFlipStateRef.current = isFlipped;
    previousCardIdRef.current = cardId;
  }, [isFlipped, cardId, answerText, enabled]);
}

export default useTTSFlashcard;
