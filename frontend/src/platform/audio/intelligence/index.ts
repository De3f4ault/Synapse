/**
 * Intelligence Layer - Barrel Export
 *
 * Intent inference and behavioral adaptation.
 * Observer-only: reads history, emits recommendations.
 */

export { listeningModel } from './ListeningModel';
export {
  inferBias,
  buildRecommendation,
  scoreToBias,
  applyTimeDecay,
  sampleCountToConfidence,
} from './heuristics';
export {
  type Bias,
  type Confidence,
  type CapabilityRecommendation,
  type AudioRecommendation,
  type BehaviorSignals,
  type ContextSignals,
  type PersistedPreferences,
  RECOMMENDATION_TTL_MS,
  MIN_ACTIONABLE_CONFIDENCE,
  DAILY_DECAY_FACTOR,
  MIN_SESSIONS_FOR_CONFIDENCE,
} from './types';
