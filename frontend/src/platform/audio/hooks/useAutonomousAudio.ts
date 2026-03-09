/**
 * useAutonomousAudio - Context-Aware Audio Auto-Start
 *
 * Handles autonomous music playback based on context and consent.
 * Resume-last-first, fallback to default, respect autonomy settings.
 */

import { useEffect, useRef } from 'react';
import { focusMusicClient } from '../clients/FocusMusicClient';
import { autonomyManager } from '../autonomy/AutonomyManager';
import { useAudioContext } from '../context/useAudioContext';

interface UseAutonomousAudioOptions {
  /** Override auto-start behavior */
  disabled?: boolean;
}

/**
 * Hook that handles autonomous music behavior based on context.
 * 
 * Behavior:
 * - On study/review context: may auto-start music (if consented)
 * - On context switch: stops music cleanly
 * - Respects user manual overrides
 * 
 * @example
 * // In ReviewPage or StudyPage
 * useAutonomousAudio();
 */
export function useAutonomousAudio(options: UseAutonomousAudioOptions = {}): void {
  const { disabled = false } = options;
  const { context } = useAudioContext();
  const hasStartedRef = useRef(false);
  const previousContextRef = useRef(context);

  useEffect(() => {
    if (disabled) return;

    const handleContextChange = async () => {
      const contextChanged = previousContextRef.current !== context;
      previousContextRef.current = context;

      // Check if we should auto-start music
      if (!hasStartedRef.current || contextChanged) {
        const shouldStart = focusMusicClient.shouldAutoStart();
        const hasAutonomyConsent = autonomyManager.shouldAutoApply(context, 'music');

        if (shouldStart && hasAutonomyConsent && !focusMusicClient.isActive()) {
          // Try to resume last session first
          const resumeState = await focusMusicClient.getResumeState();
          
          if (resumeState) {
            console.debug('[useAutonomousAudio] Resuming last session');
            await focusMusicClient.activate(
              resumeState.trackId,
              resumeState.playlistId,
              context as 'study' | 'review'
            );
          }
          // If no resume state, do nothing — silence is better than wrong music
          
          hasStartedRef.current = true;
        }
      }
    };

    handleContextChange();

    // Cleanup on unmount or context change
    return () => {
      if (focusMusicClient.isActive()) {
        // Only deactivate if context is changing away from study/review
        const isStudyContext = ['study', 'review'].includes(context);
        if (!isStudyContext) {
          focusMusicClient.deactivate('context_switch');
        }
      }
    };
  }, [context, disabled]);
}

export default useAutonomousAudio;
