/**
 * useAudioContext - React Hook for Audio Context
 *
 * Provides reactive access to the current audio context.
 * Re-renders when context changes.
 */

import { useState, useEffect } from 'react';
import { audioContextResolver } from './AudioContextResolver';
import type { AudioContext, AudioContextProfile } from './contextProfiles';

interface UseAudioContextReturn {
  /** Current audio context */
  context: AudioContext;
  /** Current context profile */
  profile: AudioContextProfile;
  /** Check if a behavior is allowed */
  allows: (behavior: 'tts' | 'notifications' | 'autoStart') => boolean;
}

export function useAudioContext(): UseAudioContextReturn {
  const [context, setContext] = useState<AudioContext>(
    audioContextResolver.getContext()
  );
  const [profile, setProfile] = useState<AudioContextProfile>(
    audioContextResolver.getProfile()
  );

  useEffect(() => {
    const unsubscribe = audioContextResolver.subscribe((ctx, prof) => {
      setContext(ctx);
      setProfile(prof);
    });

    return unsubscribe;
  }, []);

  return {
    context,
    profile,
    allows: (behavior) => audioContextResolver.allows(behavior),
  };
}
