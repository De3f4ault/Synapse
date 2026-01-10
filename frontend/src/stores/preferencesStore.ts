import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Preferences Store
 *
 * Manages user preferences for UI customization:
 * - Display settings (compact mode, animations, font size)
 * - Review settings (auto-flip, sounds, auto-advance)
 * - Notification preferences
 * - Editor preferences
 * - Study goals and preferences
 */

interface DisplayPreferences {
  compactMode: boolean;
  showAnimations: boolean;
  fontSize: "sm" | "md" | "lg";
}

interface ReviewPreferences {
  autoFlipCards: boolean;
  autoAdvanceOnReview: boolean;
  reviewSoundEffects: boolean;
  showKeyboardHints: boolean;
}

interface NotificationPreferences {
  desktopNotifications: boolean;
  reviewReminders: boolean;
  dailyGoalReminder: boolean;
}

interface EditorPreferences {
  theme: "light" | "dark" | "auto";
  fontSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
}

interface StudyPreferences {
  dailyGoal: number; // Number of cards to review per day
  preferredStudyTime: string; // e.g., "morning", "afternoon", "evening"
  sessionLength: number; // Minutes per study session
}

interface PreferencesState {
  // Preferences
  display: DisplayPreferences;
  review: ReviewPreferences;
  notifications: NotificationPreferences;
  editor: EditorPreferences;
  study: StudyPreferences;

  // Actions
  updateDisplay: (updates: Partial<DisplayPreferences>) => void;
  updateReview: (updates: Partial<ReviewPreferences>) => void;
  updateNotifications: (updates: Partial<NotificationPreferences>) => void;
  updateEditor: (updates: Partial<EditorPreferences>) => void;
  updateStudy: (updates: Partial<StudyPreferences>) => void;
  resetPreferences: () => void;
}

// Default preferences
const defaultPreferences = {
  display: {
    compactMode: false,
    showAnimations: true,
    fontSize: "md" as const,
  },
  review: {
    autoFlipCards: false,
    autoAdvanceOnReview: false,
    reviewSoundEffects: false,
    showKeyboardHints: true,
  },
  notifications: {
    desktopNotifications: false,
    reviewReminders: true,
    dailyGoalReminder: true,
  },
  editor: {
    theme: "auto" as const,
    fontSize: 14,
    lineNumbers: true,
    wordWrap: true,
  },
  study: {
    dailyGoal: 20,
    preferredStudyTime: "morning",
    sessionLength: 25,
  },
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultPreferences,

      // Update display preferences
      updateDisplay: (updates) => {
        set((state) => ({
          display: { ...state.display, ...updates },
        }));
      },

      // Update review preferences
      updateReview: (updates) => {
        set((state) => ({
          review: { ...state.review, ...updates },
        }));
      },

      // Update notification preferences
      updateNotifications: (updates) => {
        set((state) => ({
          notifications: { ...state.notifications, ...updates },
        }));
      },

      // Update editor preferences
      updateEditor: (updates) => {
        set((state) => ({
          editor: { ...state.editor, ...updates },
        }));
      },

      // Update study preferences
      updateStudy: (updates) => {
        set((state) => ({
          study: { ...state.study, ...updates },
        }));
      },

      // Reset to defaults
      resetPreferences: () => {
        set(defaultPreferences);
      },
    }),
    {
      name: "synapse-preferences",
    },
  ),
);

/**
 * Helper hooks for specific preference groups
 */
export const useDisplayPreferences = () => {
  const display = usePreferencesStore((s) => s.display);
  const updateDisplay = usePreferencesStore((s) => s.updateDisplay);
  return { ...display, updateDisplay };
};

export const useReviewPreferences = () => {
  const review = usePreferencesStore((s) => s.review);
  const updateReview = usePreferencesStore((s) => s.updateReview);
  return { ...review, updateReview };
};

export const useStudyPreferences = () => {
  const study = usePreferencesStore((s) => s.study);
  const updateStudy = usePreferencesStore((s) => s.updateStudy);
  return { ...study, updateStudy };
};
