/**
 * Notes Module - useEditorShortcuts Hook
 * Keyboard shortcuts for the note editor.
 */

import { useEffect, useCallback } from "react";
import { useEditorStore } from "../state/editorStore";
import type { ToolDockAction } from "../../core";

// ============================================================================
// Types
// ============================================================================

interface ShortcutConfig {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    action: ToolDockAction | (() => void);
    description: string;
}

interface UseEditorShortcutsOptions {
    onAction: (action: ToolDockAction) => void;
    enabled?: boolean;
}

// ============================================================================
// Default Shortcuts
// ============================================================================

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
    { key: "s", metaKey: true, action: "save", description: "Save note" },
    { key: "e", metaKey: true, action: "toggle_edit", description: "Toggle edit mode" },
    { key: "Escape", action: "toggle_edit", description: "Exit edit mode" },
];

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for handling editor keyboard shortcuts.
 */
export function useEditorShortcuts({
    onAction,
    enabled = true,
}: UseEditorShortcutsOptions) {
    const mode = useEditorStore((state) => state.mode);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            for (const shortcut of DEFAULT_SHORTCUTS) {
                const metaMatch = shortcut.metaKey
                    ? event.metaKey || event.ctrlKey
                    : !event.metaKey && !event.ctrlKey;
                const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : true;
                const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

                if (
                    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
                    metaMatch &&
                    ctrlMatch &&
                    shiftMatch
                ) {
                    event.preventDefault();

                    if (typeof shortcut.action === "function") {
                        shortcut.action();
                    } else {
                        onAction(shortcut.action);
                    }
                    return;
                }
            }
        },
        [enabled, onAction]
    );

    useEffect(() => {
        if (enabled) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
        return undefined;
    }, [enabled, handleKeyDown]);

    return {
        shortcuts: DEFAULT_SHORTCUTS,
        mode,
    };
}
