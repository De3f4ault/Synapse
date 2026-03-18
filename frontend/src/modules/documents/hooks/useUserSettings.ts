/**
 * useUserSettings — Zustand + localStorage store for UI settings
 *
 * Ported from Paperless-ngx data/ui-settings.ts (293 lines):
 *   - SETTINGS_KEYS: 40+ typed settings with defaults
 *   - Persisted to localStorage (Paperless uses server + local cache)
 *   - Grouped by category: appearance, documents, notifications, features
 *
 * We implement a pragmatic subset relevant to Synapse's current features.
 * Additional settings can be added as features are built.
 */

import { create } from "zustand";

// ============================================================================
// Settings keys (subset of Paperless SETTINGS_KEYS, L22-79)
// ============================================================================

export const SETTINGS_KEYS = {
  // Appearance
  DARK_MODE_USE_SYSTEM: "dark-mode:use-system",
  DARK_MODE_ENABLED: "dark-mode:enabled",
  THEME_COLOR: "theme:color",
  SLIM_SIDEBAR: "slim-sidebar",

  // Documents
  DOCUMENT_LIST_SIZE: "document-list-size",
  USE_NATIVE_PDF_VIEWER: "native-pdf-viewer",
  DATE_FORMAT: "date-format",

  // Notifications (matching Paperless L42-48)
  NOTIFICATIONS_NEW_DOCUMENT: "notifications:consumer-new-documents",
  NOTIFICATIONS_SUCCESS: "notifications:consumer-success",
  NOTIFICATIONS_FAILED: "notifications:consumer-failed",
  NOTIFICATIONS_SUPPRESS_DASHBOARD: "notifications:consumer-suppress-on-dashboard",

  // Features
  NOTES_ENABLED: "notes-enabled",
  AUDITLOG_ENABLED: "auditlog-enabled",

  // Saved views
  SAVED_VIEWS_WARN_UNSAVED: "saved-views:warn-on-unsaved-change",
  DASHBOARD_VIEWS_SORT: "saved-views:dashboard-views-sort-order",
  SIDEBAR_VIEWS_SORT: "saved-views:sidebar-views-sort-order",

  // Bulk edit
  BULK_EDIT_CONFIRMATION: "bulk-edit:confirmation-dialogs",
  BULK_EDIT_APPLY_ON_CLOSE: "bulk-edit:apply-on-close",

  // Trash (matching Paperless L75)
  EMPTY_TRASH_DELAY: "trash-delay",

  // Tour
  TOUR_COMPLETE: "tour-complete",
} as const;

// ============================================================================
// Defaults (matching Paperless SETTINGS array L81-292)
// ============================================================================

type SettingsMap = Record<string, unknown>;

const DEFAULTS: SettingsMap = {
  [SETTINGS_KEYS.DARK_MODE_USE_SYSTEM]: true,
  [SETTINGS_KEYS.DARK_MODE_ENABLED]: false,
  [SETTINGS_KEYS.THEME_COLOR]: "",
  [SETTINGS_KEYS.SLIM_SIDEBAR]: false,
  [SETTINGS_KEYS.DOCUMENT_LIST_SIZE]: 50,
  [SETTINGS_KEYS.USE_NATIVE_PDF_VIEWER]: false,
  [SETTINGS_KEYS.DATE_FORMAT]: "mediumDate",
  [SETTINGS_KEYS.NOTIFICATIONS_NEW_DOCUMENT]: true,
  [SETTINGS_KEYS.NOTIFICATIONS_SUCCESS]: true,
  [SETTINGS_KEYS.NOTIFICATIONS_FAILED]: true,
  [SETTINGS_KEYS.NOTIFICATIONS_SUPPRESS_DASHBOARD]: true,
  [SETTINGS_KEYS.NOTES_ENABLED]: true,
  [SETTINGS_KEYS.AUDITLOG_ENABLED]: true,
  [SETTINGS_KEYS.SAVED_VIEWS_WARN_UNSAVED]: true,
  [SETTINGS_KEYS.DASHBOARD_VIEWS_SORT]: [],
  [SETTINGS_KEYS.SIDEBAR_VIEWS_SORT]: [],
  [SETTINGS_KEYS.BULK_EDIT_CONFIRMATION]: true,
  [SETTINGS_KEYS.BULK_EDIT_APPLY_ON_CLOSE]: false,
  [SETTINGS_KEYS.EMPTY_TRASH_DELAY]: 30,
  [SETTINGS_KEYS.TOUR_COMPLETE]: false,
};

// ============================================================================
// Persistence
// ============================================================================

const STORAGE_KEY = "synapse_ui_settings";

function loadSettings(): SettingsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { ...DEFAULTS };
}

function saveSettings(settings: SettingsMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving settings", e);
  }
}

// ============================================================================
// Store
// ============================================================================

interface UserSettingsState {
  settings: SettingsMap;

  /** Get a setting value with type */
  get: <T>(key: string) => T;

  /** Set a setting value */
  set: (key: string, value: unknown) => void;

  /** Reset a setting to its default */
  resetKey: (key: string) => void;

  /** Reset all settings to defaults */
  resetAll: () => void;
}

export const useUserSettings = create<UserSettingsState>((set, get) => ({
  settings: loadSettings(),

  get: <T,>(key: string): T => {
    const val = get().settings[key];
    return (val !== undefined ? val : DEFAULTS[key]) as T;
  },

  set: (key: string, value: unknown) => {
    set((state) => {
      const updated = { ...state.settings, [key]: value };
      saveSettings(updated);
      return { settings: updated };
    });
  },

  resetKey: (key: string) => {
    set((state) => {
      const updated = { ...state.settings, [key]: DEFAULTS[key] };
      saveSettings(updated);
      return { settings: updated };
    });
  },

  resetAll: () => {
    const defaults = { ...DEFAULTS };
    saveSettings(defaults);
    set({ settings: defaults });
  },
}));
