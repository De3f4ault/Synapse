/**
 * Keyboard shortcuts
 * Defines all keyboard shortcuts for chat interface
 */

import type { ChatShortcutAction } from '../types/chat.types';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  action: ChatShortcutAction;
  description: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean; // Cmd on Mac, Win on Windows
  };
  enabled?: boolean;
}

/**
 * Platform detection
 */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/**
 * Modifier key labels
 */
export const MODIFIER_LABELS = {
  meta: IS_MAC ? '⌘' : 'Ctrl',
  ctrl: 'Ctrl',
  shift: '⇧',
  alt: IS_MAC ? '⌥' : 'Alt',
} as const;

/**
 * All keyboard shortcuts
 */
export const SHORTCUTS: Record<string, KeyboardShortcut> = {
  // Session management
  NEW_CHAT: {
    key: 'n',
    action: 'new_chat',
    description: 'Start a new chat',
    modifiers: { meta: true },
    enabled: true,
  },

  DELETE_SESSION: {
    key: 'd',
    action: 'delete_session',
    description: 'Delete current session',
    modifiers: { meta: true, shift: true },
    enabled: true,
  },

  // Navigation
  SEARCH: {
    key: 'k',
    action: 'search',
    description: 'Search messages',
    modifiers: { meta: true },
    enabled: true,
  },

  TOGGLE_SIDEBAR: {
    key: 'b',
    action: 'toggle_sidebar',
    description: 'Toggle left sidebar',
    modifiers: { meta: true },
    enabled: true,
  },

  TOGGLE_PREVIEW: {
    key: 'p',
    action: 'toggle_preview',
    description: 'Toggle preview sidebar',
    modifiers: { meta: true },
    enabled: true,
  },

  FOCUS_INPUT: {
    key: '/',
    action: 'focus_input',
    description: 'Focus message input',
    modifiers: {},
    enabled: true,
  },

  // Scrolling
  SCROLL_TO_TOP: {
    key: 'Home',
    action: 'scroll_to_top',
    description: 'Scroll to top',
    modifiers: {},
    enabled: true,
  },

  SCROLL_TO_BOTTOM: {
    key: 'End',
    action: 'scroll_to_bottom',
    description: 'Scroll to bottom',
    modifiers: {},
    enabled: true,
  },

  // Message actions
  SEND_MESSAGE: {
    key: 'Enter',
    action: 'send_message',
    description: 'Send message',
    modifiers: { meta: true },
    enabled: true,
  },

  COPY_LAST_MESSAGE: {
    key: 'c',
    action: 'copy_last_message',
    description: 'Copy last message',
    modifiers: { meta: true, shift: true },
    enabled: true,
  },

  REGENERATE_LAST: {
    key: 'r',
    action: 'regenerate_last',
    description: 'Regenerate last response',
    modifiers: { meta: true },
    enabled: true,
  },
} as const;

/**
 * Get shortcut key combination string
 */
export const getShortcutLabel = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];

  if (shortcut.modifiers?.meta) {
    parts.push(MODIFIER_LABELS.meta);
  }
  if (shortcut.modifiers?.ctrl) {
    parts.push(MODIFIER_LABELS.ctrl);
  }
  if (shortcut.modifiers?.shift) {
    parts.push(MODIFIER_LABELS.shift);
  }
  if (shortcut.modifiers?.alt) {
    parts.push(MODIFIER_LABELS.alt);
  }

  // Format key
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);

  return parts.join(' + ');
};

/**
 * Check if keyboard event matches shortcut
 */
export const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
  // Check if shortcut is enabled
  if (shortcut.enabled === false) return false;

  // Check key
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
  if (!keyMatches) return false;

  // Check modifiers
  const metaMatches = !shortcut.modifiers?.meta || (IS_MAC ? event.metaKey : event.ctrlKey);
  const ctrlMatches = !shortcut.modifiers?.ctrl || event.ctrlKey;
  const shiftMatches = !shortcut.modifiers?.shift || event.shiftKey;
  const altMatches = !shortcut.modifiers?.alt || event.altKey;

  return metaMatches && ctrlMatches && shiftMatches && altMatches;
};

/**
 * Find shortcut by event
 */
export const findShortcutByEvent = (event: KeyboardEvent): KeyboardShortcut | undefined => {
  return Object.values(SHORTCUTS).find(shortcut => matchesShortcut(event, shortcut));
};

/**
 * Get all shortcuts grouped by category
 */
export interface ShortcutCategory {
  label: string;
  shortcuts: KeyboardShortcut[];
}

export const getShortcutsByCategory = (): ShortcutCategory[] => {
  return [
    {
      label: 'Session Management',
      shortcuts: [SHORTCUTS.NEW_CHAT, SHORTCUTS.DELETE_SESSION],
    },
    {
      label: 'Navigation',
      shortcuts: [
        SHORTCUTS.SEARCH,
        SHORTCUTS.TOGGLE_SIDEBAR,
        SHORTCUTS.TOGGLE_PREVIEW,
        SHORTCUTS.FOCUS_INPUT,
      ],
    },
    {
      label: 'Scrolling',
      shortcuts: [SHORTCUTS.SCROLL_TO_TOP, SHORTCUTS.SCROLL_TO_BOTTOM],
    },
    {
      label: 'Messages',
      shortcuts: [
        SHORTCUTS.SEND_MESSAGE,
        SHORTCUTS.COPY_LAST_MESSAGE,
        SHORTCUTS.REGENERATE_LAST,
      ],
    },
  ];
};

/**
 * Shortcut help text for UI display
 */
export const SHORTCUT_HELP_TEXT = {
  title: 'Keyboard Shortcuts',
  description: 'Use these keyboard shortcuts to navigate faster',
  footer: 'Press Esc to close',
} as const;

/**
 * Enable/disable shortcut
 */
export const toggleShortcut = (action: ChatShortcutAction, enabled: boolean): void => {
  const shortcut = Object.values(SHORTCUTS).find(s => s.action === action);
  if (shortcut) {
    shortcut.enabled = enabled;
  }
};

/**
 * Check if shortcuts are available (not in input fields)
 */
export const areShortcutsAvailable = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return true;

  const tagName = target.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea';
  const isContentEditable = target.isContentEditable;

  return !isInput && !isContentEditable;
};
