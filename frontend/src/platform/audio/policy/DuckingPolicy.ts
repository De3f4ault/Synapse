/**
 * DuckingPolicy - Pure Ducking Computation
 *
 * Given active sources and their properties, computes which sources
 * should duck and by how much.
 *
 * ## Contract
 * - This is a PURE FUNCTION
 * - No side effects
 * - No AudioContext access
 * - Deterministic output for same input
 * - Unit testable
 */

import { AudioSource, DuckingProfile, DUCKING_PROFILES, DuckingProfileName } from './types';

/**
 * Compute ducking profiles for all registered sources based on active set.
 *
 * Algorithm:
 * 1. Find highest-priority active source that ducksOthers
 * 2. Apply that source's kind profile to all duckable sources
 * 3. Non-duckable sources get 'none' profile
 *
 * @param sources - All registered audio sources
 * @param activeSources - Set of currently active source IDs
 * @returns Map of sourceId → DuckingProfile
 */
export function computeDucking(
  sources: Map<string, AudioSource>,
  activeSources: Set<string>
): Map<string, DuckingProfile> {
  const result = new Map<string, DuckingProfile>();

  // Find the dominant source (highest priority that ducks others)
  let dominantSource: AudioSource | null = null;

  for (const id of activeSources) {
    const source = sources.get(id);
    if (source?.ducksOthers) {
      if (!dominantSource || source.priority < dominantSource.priority) {
        dominantSource = source;
      }
    }
  }

  // Compute profile for each source
  for (const [id, source] of sources) {
    if (!dominantSource) {
      // No ducking needed
      result.set(id, DUCKING_PROFILES.none);
    } else if (id === dominantSource.id) {
      // Dominant source is never ducked
      result.set(id, DUCKING_PROFILES.none);
    } else if (source.duckable) {
      // Apply ducking based on dominant source's kind
      // AudioSourceKind is a subset of DuckingProfileName
      const profileName = dominantSource.kind as DuckingProfileName;
      result.set(id, DUCKING_PROFILES[profileName]);
    } else {
      // Non-duckable sources are never ducked
      result.set(id, DUCKING_PROFILES.none);
    }
  }

  return result;
}

/**
 * Get the most aggressive profile (lowest gain) from a set.
 * Useful when multiple sources are ducking simultaneously.
 */
export function getMostAggressiveProfile(
  profiles: DuckingProfile[]
): DuckingProfile {
  if (profiles.length === 0) return DUCKING_PROFILES.none;

  return profiles.reduce((aggressive, current) =>
    current.targetGain < aggressive.targetGain ? current : aggressive
  );
}

