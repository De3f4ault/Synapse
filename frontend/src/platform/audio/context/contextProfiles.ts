/**
 * Context Profiles - Audio Behavior Presets
 *
 * Defines how audio should behave in different app contexts.
 * These are HINTS, not commands. Clients interpret them.
 *
 * ## Design Principle
 * - Profiles are read-only data
 * - They describe preferences, not mandates
 * - Clients choose whether to act on them
 */

/**
 * Audio context types corresponding to app modes.
 */
export type AudioContext =
  | 'study'      // Active learning, deep focus (flashcard review, quiz)
  | 'review'     // Quick review, lighter focus
  | 'chat'       // Conversation with AI
  | 'browse'     // General navigation, reading
  | 'idle';      // User not actively engaged

/**
 * Context profile defining audio preferences.
 */
export interface AudioContextProfile {
  /** The context type */
  context: AudioContext;

  /** Suggested playlist category (null = user choice) */
  suggestedPlaylist: string | null;

  /** Should music auto-start when entering this context? */
  autoStartMusic: boolean;

  /** Should music auto-pause when leaving this context? */
  autoPauseOnLeave: boolean;

  /** Allow TTS in this context? */
  allowTTS: boolean;

  /** Allow notification sounds in this context? */
  allowNotifications: boolean;

  /** Ducking aggressiveness for this context */
  duckingBias: 'aggressive' | 'moderate' | 'minimal';
}

/**
 * Default profiles for each context.
 */
export const CONTEXT_PROFILES: Record<AudioContext, AudioContextProfile> = {
  study: {
    context: 'study',
    suggestedPlaylist: 'deep-focus',
    autoStartMusic: true,
    autoPauseOnLeave: false,
    allowTTS: true,
    allowNotifications: false,  // Suppress during deep focus
    duckingBias: 'aggressive',
  },

  review: {
    context: 'review',
    suggestedPlaylist: 'ambient-study',
    autoStartMusic: false,
    autoPauseOnLeave: false,
    allowTTS: true,
    allowNotifications: false,  // Suppress during review
    duckingBias: 'moderate',
  },

  chat: {
    context: 'chat',
    suggestedPlaylist: 'conversation-ambient',
    autoStartMusic: false,
    autoPauseOnLeave: false,
    allowTTS: true,             // TTS for AI responses
    allowNotifications: true,
    duckingBias: 'moderate',
  },

  browse: {
    context: 'browse',
    suggestedPlaylist: null,    // User choice
    autoStartMusic: false,
    autoPauseOnLeave: false,
    allowTTS: false,
    allowNotifications: true,
    duckingBias: 'minimal',
  },

  idle: {
    context: 'idle',
    suggestedPlaylist: null,
    autoStartMusic: false,
    autoPauseOnLeave: false,
    allowTTS: false,
    allowNotifications: true,
    duckingBias: 'minimal',
  },
};

/**
 * Route patterns for context detection.
 * Order matters: first match wins.
 */
export const ROUTE_CONTEXT_MAP: Array<{ pattern: RegExp; context: AudioContext }> = [
  // Study contexts (deep focus)
  { pattern: /^\/flashcards\/[^/]+\/review/, context: 'study' },
  { pattern: /^\/quizzes\/[^/]+\/attempt/, context: 'study' },
  { pattern: /^\/study\/session/, context: 'study' },

  // Review contexts (lighter focus)
  { pattern: /^\/flashcards\/[^/]+/, context: 'review' },
  { pattern: /^\/study/, context: 'review' },

  // Chat context
  { pattern: /^\/chat/, context: 'chat' },

  // Browse context (default for most pages)
  { pattern: /^\//, context: 'browse' },
];
