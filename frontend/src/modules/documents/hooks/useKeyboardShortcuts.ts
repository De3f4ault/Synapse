/**
 * useKeyboardShortcuts — DMS-specific keyboard shortcuts
 *
 * Based on Paperless-ngx hot-key.service.ts.
 * Registers global listeners for document navigation and actions.
 */

import { useEffect, useCallback } from "react";

interface KeyboardShortcutHandlers {
  /** Ctrl+K or / — open global search */
  onOpenSearch?: () => void;
  /** Escape — reset filters / deselect */
  onEscape?: () => void;
  /** a — select all documents */
  onSelectAll?: () => void;
  /** p — select current page */
  onSelectPage?: () => void;
  /** o — open first selected document */
  onOpenSelected?: () => void;
  /** ? — show keyboard shortcuts dialog */
  onShowHelp?: () => void;
  /** Ctrl+← — previous page */
  onPreviousPage?: () => void;
  /** Ctrl+→ — next page */
  onNextPage?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Ctrl+K — always works, even in inputs
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        handlers.onOpenSearch?.();
        return;
      }

      // Ctrl+Arrow — pagination (always works)
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        handlers.onPreviousPage?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
        e.preventDefault();
        handlers.onNextPage?.();
        return;
      }

      // Don't handle simple keys when focused on input
      if (isInput) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          handlers.onOpenSearch?.();
          break;
        case "Escape":
          handlers.onEscape?.();
          break;
        case "a":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onSelectAll?.();
          }
          break;
        case "p":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onSelectPage?.();
          }
          break;
        case "o":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onOpenSelected?.();
          }
          break;
        case "?":
          e.preventDefault();
          handlers.onShowHelp?.();
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Keyboard shortcuts reference data for the help dialog.
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: ["Ctrl", "K"], description: "Open global search" },
  { keys: ["/"], description: "Open global search" },
  { keys: ["Esc"], description: "Reset filters / deselect" },
  { keys: ["a"], description: "Select all documents" },
  { keys: ["p"], description: "Select current page" },
  { keys: ["o"], description: "Open first selected document" },
  { keys: ["Ctrl", "←"], description: "Previous page" },
  { keys: ["Ctrl", "→"], description: "Next page" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
] as const;
