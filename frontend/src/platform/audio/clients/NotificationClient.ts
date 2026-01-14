/**
 * NotificationClient - Alert & Feedback Sounds
 *
 * Fire-and-forget audio client for short-lived sounds.
 * Stateless, no sessions, no persistence.
 *
 * ## Design Principles
 * - STATELESS: No sessions, no history, no resume
 * - FIRE-AND-FORGET: Play → auto-stop → done
 * - HIGH PRIORITY: Always plays, ducks everything else
 *
 * ## Client Lifecycle
 * - Registers ONCE at construction (kind: 'alert', priority 100)
 * - play() activates policy → plays sound → deactivates policy
 * - No pause, no stop, no resume
 */

import { soundPolicy } from '../policy/SoundPolicy';
import type { AudioSource } from '../policy/types';

// Notifications have highest priority — they always win
const NOTIFICATION_SOURCE: AudioSource = {
  id: 'notification',
  priority: 100,      // Higher than TTS (90) and music (10)
  duckable: false,    // Never ducked by anything
  ducksOthers: true,  // Ducks everything while playing
  kind: 'alert',
};

/**
 * Standard notification sounds.
 * These should be short audio files (< 2 seconds).
 */
export type NotificationSound =
  | 'session_complete'
  | 'item_due'
  | 'error'
  | 'success'
  | 'alert';

/**
 * Sound file mapping.
 * TODO: Replace with actual sound file paths once available.
 */
const SOUND_URLS: Record<NotificationSound, string> = {
  session_complete: '/sounds/session-complete.mp3',
  item_due: '/sounds/item-due.mp3',
  error: '/sounds/error.mp3',
  success: '/sounds/success.mp3',
  alert: '/sounds/alert.mp3',
};

export interface NotificationOptions {
  /** Volume 0-1, default 0.8 */
  volume?: number;
}

class NotificationClient {
  constructor() {
    // Register with SoundPolicy
    soundPolicy.registerSource(NOTIFICATION_SOURCE);
    console.debug('[NotificationClient] Registered with SoundPolicy');
  }

  get source(): AudioSource {
    return NOTIFICATION_SOURCE;
  }

  /**
   * Play a notification sound.
   * Fire-and-forget: returns when sound completes.
   */
  async play(sound: NotificationSound, options: NotificationOptions = {}): Promise<void> {
    const { volume = 0.8 } = options;

    // Check if notifications are allowed in current context
    try {
      const { audioContextResolver } = require('../context/AudioContextResolver');
      if (!audioContextResolver.allows('notifications')) {
        console.debug(`[NotificationClient] Suppressed ${sound} by context`);
        return; // Silent no-op
      }
    } catch {
      // Context not loaded, allow by default
    }

    // Get sound URL
    const url = SOUND_URLS[sound];
    if (!url) {
      console.warn(`[NotificationClient] Unknown sound: ${sound}`);
      return;
    }

    try {
      // Activate policy → triggers ducking
      soundPolicy.setActive(NOTIFICATION_SOURCE.id, true);

      // Lazy import to avoid circular dependency
      const { audioEngine } = await import('../core/AudioEngine');
      await audioEngine.playOneShot(url, { volume });

    } finally {
      // Always deactivate policy → releases ducking
      soundPolicy.setActive(NOTIFICATION_SOURCE.id, false);
    }
  }

  /**
   * Play a custom sound by URL.
   * For sounds not in the standard set.
   */
  async playCustom(url: string, options: NotificationOptions = {}): Promise<void> {
    const { volume = 0.8 } = options;

    // Check if notifications are allowed in current context
    try {
      const { audioContextResolver } = require('../context/AudioContextResolver');
      if (!audioContextResolver.allows('notifications')) {
        console.debug('[NotificationClient] Custom sound suppressed by context');
        return;
      }
    } catch {
      // Context not loaded, allow by default
    }

    try {
      soundPolicy.setActive(NOTIFICATION_SOURCE.id, true);
      
      // Lazy import to avoid circular dependency
      const { audioEngine } = await import('../core/AudioEngine');
      await audioEngine.playOneShot(url, { volume });
      
    } finally {
      soundPolicy.setActive(NOTIFICATION_SOURCE.id, false);
    }
  }
}

// Singleton export
export const notificationClient = new NotificationClient();
