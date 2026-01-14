/**
 * useAutonomy - React Hook for Autonomy Control
 *
 * Provides reactive access to autonomy settings.
 * Allows UI to display and modify consent levels.
 */

import { useState, useEffect, useCallback } from 'react';
import { autonomyManager } from './AutonomyManager';
import type { AutonomyLevel, AutonomyCapability } from './types';
import type { AudioContext } from '../context/contextProfiles';

interface UseAutonomyReturn {
  /** Is global autonomy enabled? */
  globalEnabled: boolean;
  /** Toggle global autonomy */
  setGlobalEnabled: (enabled: boolean) => void;
  /** Get level for context + capability */
  getLevel: (context: AudioContext, capability: AutonomyCapability) => AutonomyLevel;
  /** Set level for context + capability */
  setLevel: (context: AudioContext, capability: AutonomyCapability, level: AutonomyLevel) => void;
  /** Should capability auto-apply in context? */
  shouldAutoApply: (context: AudioContext, capability: AutonomyCapability) => boolean;
  /** Should capability be suggested in context? */
  shouldSuggest: (context: AudioContext, capability: AutonomyCapability) => boolean;
}

export function useAutonomy(): UseAutonomyReturn {
  const [globalEnabled, setGlobalEnabledState] = useState(
    autonomyManager.isGlobalEnabled()
  );
  const [, forceUpdate] = useState(0);

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = autonomyManager.subscribe(() => {
      setGlobalEnabledState(autonomyManager.isGlobalEnabled());
      forceUpdate(n => n + 1);
    });

    return unsubscribe;
  }, []);

  const setGlobalEnabled = useCallback((enabled: boolean) => {
    autonomyManager.setGlobalEnabled(enabled);
    setGlobalEnabledState(enabled);
  }, []);

  const getLevel = useCallback((context: AudioContext, capability: AutonomyCapability) => {
    return autonomyManager.getLevel(context, capability);
  }, []);

  const setLevel = useCallback((
    context: AudioContext,
    capability: AutonomyCapability,
    level: AutonomyLevel
  ) => {
    autonomyManager.setLevel(context, capability, level);
  }, []);

  const shouldAutoApply = useCallback((context: AudioContext, capability: AutonomyCapability) => {
    return autonomyManager.shouldAutoApply(context, capability);
  }, []);

  const shouldSuggest = useCallback((context: AudioContext, capability: AutonomyCapability) => {
    return autonomyManager.shouldSuggest(context, capability);
  }, []);

  return {
    globalEnabled,
    setGlobalEnabled,
    getLevel,
    setLevel,
    shouldAutoApply,
    shouldSuggest,
  };
}
