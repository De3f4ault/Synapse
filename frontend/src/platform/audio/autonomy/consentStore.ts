/**
 * Consent Store - Persistent User Consent
 *
 * Manages user consent for autonomy features.
 * Persisted to localStorage for cross-session retention.
 *
 * ## Design Principles
 * - Consent is explicit, never inferred
 * - All consent is user-initiated
 * - Global kill switch always works
 */

import type { AudioContext } from '../context/contextProfiles';
import type {
  AutonomyLevel,
  AutonomyCapability,
  ConsentEntry,
  ConsentState,
} from './types';
import {
  DEFAULT_AUTONOMY_LEVEL,
  CONSENT_STORAGE_KEY,
} from './types';

// ===========================================================================
// CONSENT KEY HELPERS
// ===========================================================================

function makeKey(context: AudioContext, capability: AutonomyCapability): string {
  return `${context}:${capability}`;
}

// ===========================================================================
// CONSENT STORE CLASS
// ===========================================================================

class ConsentStoreClass {
  private state: ConsentState;

  constructor() {
    this.state = this.loadFromStorage();
    console.debug('[ConsentStore] Loaded consent state');
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get consent level for a context + capability.
   */
  getLevel(context: AudioContext, capability: AutonomyCapability): AutonomyLevel {
    if (!this.state.globalEnabled) {
      return 'off';
    }

    const key = makeKey(context, capability);
    const entry = this.state.entries.get(key);
    
    return entry?.level ?? DEFAULT_AUTONOMY_LEVEL;
  }

  /**
   * Set consent level for a context + capability.
   */
  setLevel(
    context: AudioContext,
    capability: AutonomyCapability,
    level: AutonomyLevel
  ): void {
    const key = makeKey(context, capability);
    
    const entry: ConsentEntry = {
      context,
      capability,
      level,
      grantedAt: Date.now(),
    };

    this.state.entries.set(key, entry);
    this.state.updatedAt = Date.now();
    this.saveToStorage();

    console.debug(`[ConsentStore] Set ${context}:${capability} → ${level}`);
  }

  /**
   * Get full consent entry (with metadata).
   */
  getEntry(context: AudioContext, capability: AutonomyCapability): ConsentEntry | null {
    const key = makeKey(context, capability);
    return this.state.entries.get(key) ?? null;
  }

  /**
   * Check if global autonomy is enabled.
   */
  isGlobalEnabled(): boolean {
    return this.state.globalEnabled;
  }

  /**
   * Enable/disable global autonomy.
   */
  setGlobalEnabled(enabled: boolean): void {
    this.state.globalEnabled = enabled;
    this.state.updatedAt = Date.now();
    this.saveToStorage();

    console.debug(`[ConsentStore] Global autonomy ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all consent entries for a context.
   */
  getEntriesForContext(context: AudioContext): ConsentEntry[] {
    const entries: ConsentEntry[] = [];
    
    for (const [, entry] of this.state.entries) {
      if (entry.context === context) {
        entries.push(entry);
      }
    }
    
    return entries;
  }

  /**
   * Clear all consent (reset to defaults).
   */
  clearAll(): void {
    this.state = this.createDefaultState();
    this.saveToStorage();
    console.debug('[ConsentStore] Cleared all consent');
  }

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  private loadFromStorage(): ConsentState {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) {
        return this.createDefaultState();
      }

      const parsed = JSON.parse(stored);
      
      // Reconstruct Map from array
      const entries = new Map<string, ConsentEntry>();
      if (Array.isArray(parsed.entries)) {
        for (const [key, entry] of parsed.entries) {
          entries.set(key, entry);
        }
      }

      return {
        entries,
        globalEnabled: parsed.globalEnabled ?? true,
        updatedAt: parsed.updatedAt ?? Date.now(),
      };
    } catch (err) {
      console.error('[ConsentStore] Failed to load:', err);
      return this.createDefaultState();
    }
  }

  private saveToStorage(): void {
    try {
      // Convert Map to array for JSON serialization
      const toStore = {
        entries: Array.from(this.state.entries.entries()),
        globalEnabled: this.state.globalEnabled,
        updatedAt: this.state.updatedAt,
      };

      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(toStore));
    } catch (err) {
      console.error('[ConsentStore] Failed to save:', err);
    }
  }

  private createDefaultState(): ConsentState {
    return {
      entries: new Map(),
      globalEnabled: true,  // Global is on by default, individual caps are off
      updatedAt: Date.now(),
    };
  }
}

// Singleton export
export const consentStore = new ConsentStoreClass();
