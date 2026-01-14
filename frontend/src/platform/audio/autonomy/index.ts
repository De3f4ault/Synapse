/**
 * Autonomy Layer - Barrel Export
 *
 * Consent-bound intelligence activation.
 * The bridge between "knows" and "acts".
 */

export { autonomyManager } from './AutonomyManager';
export { consentStore } from './consentStore';
export { useAutonomy } from './useAutonomy';
export {
  type AutonomyLevel,
  type AutonomyCapability,
  type AutonomyQuery,
  type AutonomyDecision,
  type AutonomyReason,
  type ConsentEntry,
  DEFAULT_AUTONOMY_LEVEL,
  MIN_AUTONOMY_CONFIDENCE,
} from './types';
