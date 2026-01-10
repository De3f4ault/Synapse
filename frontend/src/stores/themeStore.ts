import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Theme Store
 *
 * Manages dark/light theme preference.
 * Applies theme class to document element.
 */

type Theme = "light" | "dark" | "system";

interface ThemeState {
  // State
  theme: Theme;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Apply theme to DOM
const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: "system",

      // Set theme
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      // Toggle between light/dark
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === "light" ? "dark" : "light";
        set({ theme: newTheme });
        applyTheme(newTheme);
      },
    }),
    {
      name: "synapse-theme",
      onRehydrateStorage: () => (state) => {
        // Apply theme after rehydration
        if (state) {
          applyTheme(state.theme);
        }
      },
    },
  ),
);

// Listen for system theme changes
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const { theme } = useThemeStore.getState();
      if (theme === "system") {
        applyTheme("system");
      }
    });
}
